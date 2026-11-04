import type { Project } from '../types';
import { projectMapDetailSamples } from '../data/projectMapDetails';
import { projectCardClassification } from './projectClassification';

type SummaryField = [label: string, value: string];

// Keep the same data source, missing-value handling and units as the overview card.
function numberLabel(value: number | undefined, unit = '') {
  return value === undefined || !Number.isFinite(value) ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}${unit}`;
}

function binSizeLabel(value?: [number, number]) {
  return value?.length === 2 && value.every(Number.isFinite)
    ? `${numberLabel(value[0])} m × ${numberLabel(value[1])} m` : '—';
}

export function projectBriefSummary(project: Project, translate: (label: string) => string) {
  const details = { ...projectMapDetailSamples[project.id], ...project.mapDetails };
  const category = projectCardClassification(project).label;
  const overview: SummaryField[] = [
    ['年度', project.year || '—'],
    ['地区', project.basin || '—'],
    ['类型', project.type ? translate(project.type) : '—'],
    ['大小（km² / km）', project.area || '—'],
  ];
  let parameterTitle: string | undefined;
  let parameters: SummaryField[] = [];

  if (category === '采集') {
    // Older overview records store the common seismic fields under processing.
    const values = {
      shotCount: details.processing?.shotCount,
      binSizeMeters: details.processing?.binSizeMeters,
      maxOffsetKm: details.processing?.maxOffsetKm,
      ...details.acquisition,
    };
    parameterTitle = '采集参数';
    parameters = [
      ['总炮数', numberLabel(values?.shotCount)],
      ['覆盖次数', numberLabel(values?.coverageCount, ` ${translate('次')}`)],
      ['面元', binSizeLabel(values?.binSizeMeters)],
      ['最大炮检距', numberLabel(values?.maxOffsetKm, ' km')],
      ['炮道密度', numberLabel(values?.shotTraceDensity)],
    ];
  } else if (category === '处理') {
    const values = details.processing;
    parameterTitle = '处理参数';
    parameters = [
      ['总炮数', numberLabel(values?.shotCount)],
      ['原始数据量', numberLabel(values?.rawDataTb, ' TB')],
      ['记录长度', numberLabel(values?.recordLengthMs, ' ms')],
      ['采样率', numberLabel(values?.sampleRateMs, ' ms')],
    ];
  } else if (category === '解释') {
    const values = {
      binSizeMeters: details.processing?.binSizeMeters,
      aspectRatio: details.processing?.aspectRatio,
      maxOffsetKm: details.processing?.maxOffsetKm,
      ...details.interpretation,
    };
    parameterTitle = '解释参数';
    parameters = [
      ['覆盖次数', numberLabel(values?.coverageCount, ` ${translate('次')}`)],
      ['面元', binSizeLabel(values?.binSizeMeters)],
      ['横纵比', numberLabel(values?.aspectRatio)],
      ['最大炮检距', numberLabel(values?.maxOffsetKm, ' km')],
    ];
  }

  return { overview, parameterTitle, parameters };
}
