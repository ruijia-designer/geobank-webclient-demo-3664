import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultFilePreview } from './ResultFilePreview';
import { forgetResultFileSource, getResultFileSource, rememberResultFileSource } from '../services/resultPreview';
import type { ResultFile } from '../services/results';

const sourceKeys:[string,string][]=[];
const source=(projectId:string,fileId:string,blob:Blob)=>{rememberResultFileSource(projectId,fileId,blob);sourceKeys.push([projectId,fileId]);};
const file=(values:Partial<ResultFile>={}):ResultFile=>({id:'one',name:'An18.las',format:'las',directory:'测井数据',size:'1 KB',uploaded:'2026-10-29',user:'Demo',...values});
beforeEach(()=>{sessionStorage.removeItem('geobank-demo-locale');});
afterEach(()=>{sourceKeys.splice(0).forEach(([projectId,fileId])=>forgetResultFileSource(projectId,fileId));vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('真实成果文件预览',()=>{
  it('无原始内容的示例只展示真实元信息和空内容提示',()=>{
    const {container}=render(<ResultFilePreview file={file()} projectName="安13北" projectId="project-a"/>);
    expect(screen.getByRole('heading',{name:'An18.las'})).toBeVisible();
    for(const value of ['LAS','测井数据','安13北','1 KB','2026-10-29','Demo','暂无可预览内容'])expect(screen.getByText(value)).toBeVisible();
    expect(container.querySelector('pre,iframe,img')).toBeNull();
  });

  it('项目隔离原始来源，文本按纯文字渲染且最多读取前 1 MiB',async()=>{
    const text='<script>alert("x")</script>\n'+ 'x'.repeat(1024*1024)+'NOT_SHOWN';
    const original=new Blob([text],{type:'text/plain'});
    source('project-a','one',original);
    source('project-b','one',new Blob(['另一个项目']));
    expect(getResultFileSource('project-a','one')).toBe(original);
    const {container,rerender}=render(<ResultFilePreview file={file()} projectName="安13北" projectId="project-a"/>);
    await waitFor(()=>expect(screen.getByLabelText('文件文本内容')).toBeVisible());
    expect(screen.getByLabelText('文件文本内容').textContent).toHaveLength(1024*1024);
    expect(screen.getByLabelText('文件文本内容').textContent).toContain('<script>alert("x")</script>');
    expect(screen.getByLabelText('文件文本内容').textContent).not.toContain('NOT_SHOWN');
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('文件较大，仅预览前 1 MiB 内容。')).toBeVisible();
    rerender(<ResultFilePreview file={file()} projectName="项目B" projectId="project-b"/>);
    await waitFor(()=>expect(screen.getByLabelText('文件文本内容')).toHaveTextContent('另一个项目'));
    forgetResultFileSource('project-a','one');
    expect(getResultFileSource('project-a','one')).toBeUndefined();
    expect(getResultFileSource('project-b','one')).toBeDefined();
  });

  it('切换文件时忽略先前异步读取结果',()=>{
    const readers:FileReader[]=[];
    vi.spyOn(FileReader.prototype,'readAsText').mockImplementation(function(this:FileReader){readers.push(this);});
    source('project-a','one',new Blob(['first']));
    source('project-a','two',new Blob(['second']));
    const {rerender}=render(<ResultFilePreview file={file()} projectName="安13北" projectId="project-a"/>);
    rerender(<ResultFilePreview file={file({id:'two',name:'second.txt',format:'txt'})} projectName="安13北" projectId="project-a"/>);
    const finish=(reader:FileReader,value:string)=>act(()=>{
      Object.defineProperty(reader,'result',{configurable:true,value});
      reader.onload?.call(reader,new ProgressEvent('load') as ProgressEvent<FileReader>);
    });
    finish(readers[1],'second');
    finish(readers[0],'first');
    expect(screen.getByLabelText('文件文本内容')).toHaveTextContent('second');
    expect(screen.getByLabelText('文件文本内容')).not.toHaveTextContent('first');
  });

  it('图片和 PDF 使用原始 Blob，切换和卸载时释放地址',()=>{
    const createObjectURL=vi.fn().mockReturnValueOnce('blob:preview-image').mockReturnValueOnce('blob:preview-pdf');
    const revokeObjectURL=vi.fn();
    class PreviewURL extends URL {
      static createObjectURL=createObjectURL;
      static revokeObjectURL=revokeObjectURL;
    }
    vi.stubGlobal('URL',PreviewURL);
    source('project-a','image',new Blob(['image bytes'],{type:'image/png'}));
    source('project-a','pdf',new Blob(['%PDF-1.7'],{type:'application/pdf'}));
    const {rerender,unmount}=render(<ResultFilePreview file={file({id:'image',name:'map.png',format:'png'})} projectName="安13北" projectId="project-a"/>);
    expect(screen.getByRole('img',{name:'map.png'})).toHaveAttribute('src','blob:preview-image');
    expect(createObjectURL.mock.calls[0][0].type).toBe('image/png');
    rerender(<ResultFilePreview file={file({id:'pdf',name:'report.pdf',format:'pdf'})} projectName="安13北" projectId="project-a"/>);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-image');
    expect(screen.getByTitle('PDF文件预览')).toHaveAttribute('src','blob:preview-pdf');
    expect(createObjectURL.mock.calls[1][0].type).toBe('application/pdf');
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-pdf');
  });

  it('不支持的格式和二进制文本不伪造内容',async()=>{
    source('project-a','one',new Blob(['binary data']));
    source('project-a','binary',new Blob(['\0binary']));
    const {rerender}=render(<ResultFilePreview file={file({format:'docx',name:'report.docx'})} projectName="安13北" projectId="project-a"/>);
    expect(screen.getByText('暂不支持此格式的内容预览')).toBeVisible();
    rerender(<ResultFilePreview file={file({id:'binary'})} projectName="安13北" projectId="project-a"/>);
    await waitFor(()=>expect(screen.getByText('无法预览此文件内容')).toBeVisible());
    expect(screen.queryByLabelText('文件文本内容')).not.toBeInTheDocument();
  });
});
