/** Original local uploads are session-only; project scopes prevent file ID collisions. */
const sources = new Map<string, Map<string, Blob>>();

export function rememberResultFileSource(projectId:string,fileId:string,blob:Blob) {
  let project=sources.get(projectId);
  if(!project){project=new Map();sources.set(projectId,project);}
  project.set(fileId,blob);
}

export function forgetResultFileSource(projectId:string,fileId:string) {
  const project=sources.get(projectId);
  project?.delete(fileId);
  if(project?.size===0)sources.delete(projectId);
}

export function getResultFileSource(projectId:string,fileId:string):Blob|undefined {
  return sources.get(projectId)?.get(fileId);
}
