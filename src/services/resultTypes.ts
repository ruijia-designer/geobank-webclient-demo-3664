export type ResultTypeCategoryId =
    | 'acquisition'
    | 'processing'
    | 'interpretation'
    | 'wellbore'
    | 'nonseismic';

export interface ResultTypeItem {
    id: string;
    name: string;
    applicableProjects: string;
    number: string;
    chineseDirectory: string;
    englishDirectory: string;
    namingRule: string;
    notes: string;
}

export interface ResultTypeGroup {
    id: string;
    name: string;
    items: ResultTypeItem[];
}

export interface ResultTypeCategory {
    id: ResultTypeCategoryId;
    name: string;
    groups: ResultTypeGroup[];
}

// Source: 基准-成果类型(2).xlsx, 数据银行各类资料存档目录, rows 2–156.
// IDs retain source row positions; the blank B38 belongs to 项目文档.
export const RESULT_TYPE_CATEGORIES: ResultTypeCategory[] = [
    {
        "id": "acquisition",
        "name": "采集",
        "groups": [
            {
                "id": "acquisition-group-2",
                "name": "基本信息",
                "items": [
                    {
                        "id": "acquisition-row-2",
                        "name": "项目信息",
                        "applicableProjects": "",
                        "number": "01",
                        "chineseDirectory": "项目信息",
                        "englishDirectory": "PRO_INFO",
                        "namingRule": "",
                        "notes": "基本信息、观测系统、工作量、地质指标、质量指标、技术指标"
                    },
                    {
                        "id": "acquisition-row-3",
                        "name": "采集参数",
                        "applicableProjects": "",
                        "number": "02",
                        "chineseDirectory": "采集参数",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": "激发参数（井炮参数、可控震源参数、气枪参数）、接收参数、仪器参数"
                    },
                    {
                        "id": "acquisition-row-4",
                        "name": "关联项目",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "acquisition-group-5",
                "name": "边界、障碍物",
                "items": [
                    {
                        "id": "acquisition-row-5",
                        "name": "满覆盖边界",
                        "applicableProjects": "",
                        "number": "03",
                        "chineseDirectory": "满覆盖边界",
                        "englishDirectory": "BDY_FULL",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-6",
                        "name": "激发点边界",
                        "applicableProjects": "",
                        "number": "04",
                        "chineseDirectory": "激发点边界",
                        "englishDirectory": "BDY_S",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-7",
                        "name": "接收点边界",
                        "applicableProjects": "",
                        "number": "05",
                        "chineseDirectory": "接收点边界",
                        "englishDirectory": "BDY_R",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-8",
                        "name": "施工边界",
                        "applicableProjects": "",
                        "number": "06",
                        "chineseDirectory": "施工边界",
                        "englishDirectory": "BDY_SURVEY",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-9",
                        "name": "障碍物",
                        "applicableProjects": "",
                        "number": "07",
                        "chineseDirectory": "障碍物",
                        "englishDirectory": "OBSTACLE",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "acquisition-group-10",
                "name": "测量资料",
                "items": [
                    {
                        "id": "acquisition-row-10",
                        "name": "原始数据",
                        "applicableProjects": "陆上地震采集、过渡带项目",
                        "number": "08",
                        "chineseDirectory": "原始数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-11",
                        "name": "成果数据",
                        "applicableProjects": "陆上地震采集、过渡带项目",
                        "number": "09",
                        "chineseDirectory": "成果数据",
                        "englishDirectory": "SURVEY_RESULT",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-12",
                        "name": "潮汐数据",
                        "applicableProjects": "过渡带项目、海底地震项目、拖缆项目",
                        "number": "10",
                        "chineseDirectory": "潮汐数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-13",
                        "name": "水深数据",
                        "applicableProjects": "陆上地震采集、过渡带项目、海底地震项目、拖缆项目",
                        "number": "11",
                        "chineseDirectory": "水深数据",
                        "englishDirectory": "WATER_DEPTH",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-14",
                        "name": "磁偏角数据",
                        "applicableProjects": "海底地震项目",
                        "number": "12",
                        "chineseDirectory": "磁偏角数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-15",
                        "name": "洋流数据",
                        "applicableProjects": "过渡带项目、海底地震项目、拖缆项目",
                        "number": "13",
                        "chineseDirectory": "洋流数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-16",
                        "name": "盐温测试数据",
                        "applicableProjects": "拖缆项目",
                        "number": "14",
                        "chineseDirectory": "盐温测试数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-17",
                        "name": "导航数据",
                        "applicableProjects": "过渡带项目、海底地震项目、拖缆项目",
                        "number": "15",
                        "chineseDirectory": "导航数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": "导航定位原始数据、导航成果数据、导航日志及班报、导航设备配置图、导航设备检测报告、导航测线质控报告等"
                    },
                    {
                        "id": "acquisition-row-18",
                        "name": "质量统计表",
                        "applicableProjects": "陆上地震采集、过渡带项目、海底地震采集、拖缆项目",
                        "number": "16",
                        "chineseDirectory": "质量统计表",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-19",
                        "name": "测量（导航）报告",
                        "applicableProjects": "陆上地震采集、过渡带项目",
                        "number": "17",
                        "chineseDirectory": "测量（导航）报告",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": "测量设计报告、设备检测报告、控制质量报告、测量总结报告、测量图件"
                    }
                ]
            },
            {
                "id": "acquisition-group-20",
                "name": "试验资料",
                "items": [
                    {
                        "id": "acquisition-row-20",
                        "name": "试验点",
                        "applicableProjects": "陆上地震采集",
                        "number": "18",
                        "chineseDirectory": "试验点",
                        "englishDirectory": "TEST_PNT",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-21",
                        "name": "试验炮集",
                        "applicableProjects": "陆上地震采集",
                        "number": "19",
                        "chineseDirectory": "试验炮集",
                        "englishDirectory": "TEST_DATA",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-22",
                        "name": "试验班报",
                        "applicableProjects": "陆上地震采集",
                        "number": "20",
                        "chineseDirectory": "试验班报",
                        "englishDirectory": "TEST_LOG",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "acquisition-group-23",
                "name": "近地表调查",
                "items": [
                    {
                        "id": "acquisition-row-23",
                        "name": "小折射",
                        "applicableProjects": "陆上地震采集",
                        "number": "21",
                        "chineseDirectory": "小折射",
                        "englishDirectory": "LVL_REFRA",
                        "namingRule": "",
                        "notes": "班报、炮集、时距图"
                    },
                    {
                        "id": "acquisition-row-24",
                        "name": "微测井",
                        "applicableProjects": "陆上地震采集",
                        "number": "22",
                        "chineseDirectory": "微测井",
                        "englishDirectory": "LVL_UPH",
                        "namingRule": "",
                        "notes": "班报、炮集、时距图"
                    },
                    {
                        "id": "acquisition-row-25",
                        "name": "Q调查",
                        "applicableProjects": "陆上地震采集",
                        "number": "23",
                        "chineseDirectory": "Q调查",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-26",
                        "name": "岩性",
                        "applicableProjects": "陆上地震采集",
                        "number": "24",
                        "chineseDirectory": "岩性",
                        "englishDirectory": "LVL_LITH",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-27",
                        "name": "表层调查成果",
                        "applicableProjects": "陆上地震采集",
                        "number": "25",
                        "chineseDirectory": "表层调查成果",
                        "englishDirectory": "LVL_RESULT",
                        "namingRule": "",
                        "notes": "成果表、成果图"
                    }
                ]
            },
            {
                "id": "acquisition-group-28",
                "name": "生产资料",
                "items": [
                    {
                        "id": "acquisition-row-28",
                        "name": "观测系统",
                        "applicableProjects": "陆上地震采集、过渡带采集、海底地震采集",
                        "number": "26",
                        "chineseDirectory": "观测系统",
                        "englishDirectory": "GEOMETRY",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-29",
                        "name": "仪器电子班报",
                        "applicableProjects": "陆上地震采集、过渡带采集、海底地震采集、拖缆采集",
                        "number": "27",
                        "chineseDirectory": "仪器电子班报",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-30",
                        "name": "气枪震源班报",
                        "applicableProjects": "过渡带采集、海底地震采集、拖缆采集",
                        "number": "28",
                        "chineseDirectory": "气枪震源班报",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-31",
                        "name": "近场子波数据",
                        "applicableProjects": "过渡带采集、海底地震采集、拖缆采集",
                        "number": "29",
                        "chineseDirectory": "近场子波数据",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-32",
                        "name": "地震数据",
                        "applicableProjects": "陆上地震采集、过渡带采集、海底地震采集、拖缆采集",
                        "number": "30",
                        "chineseDirectory": "地震数据",
                        "englishDirectory": "SEIS_DATA",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-33",
                        "name": "初至数据",
                        "applicableProjects": "陆上地震采集",
                        "number": "31",
                        "chineseDirectory": "初至数据",
                        "englishDirectory": "FB",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-34",
                        "name": "静校正量",
                        "applicableProjects": "陆上地震采集、过渡带采集",
                        "number": "32",
                        "chineseDirectory": "静校正量",
                        "englishDirectory": "STATICS",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "acquisition-group-35",
                "name": "项目文档",
                "items": [
                    {
                        "id": "acquisition-row-35",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "33",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目开工前的设计文档、施工部署图等文档材料"
                    },
                    {
                        "id": "acquisition-row-36",
                        "name": "项目过程文档",
                        "applicableProjects": "",
                        "number": "34",
                        "chineseDirectory": "项目过程文档",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "acquisition-row-37",
                        "name": "项目总结文档",
                        "applicableProjects": "",
                        "number": "35",
                        "chineseDirectory": "项目总结文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "项目开工后及结束后形成的测量文档、表层调查文档、试验文档、监督文档、项目报告、施工总结文档等各类文档材料"
                    },
                    {
                        "id": "acquisition-row-38",
                        "name": "项目成果文档",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "项目成果文档",
                        "englishDirectory": "POST_DOC",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            }
        ]
    },
    {
        "id": "processing",
        "name": "处理",
        "groups": [
            {
                "id": "processing-group-39",
                "name": "基本信息",
                "items": [
                    {
                        "id": "processing-row-39",
                        "name": "项目信息",
                        "applicableProjects": "",
                        "number": "01",
                        "chineseDirectory": "项目信息",
                        "englishDirectory": "PRO_INFO",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-40",
                        "name": "关联项目",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "processing-group-41",
                "name": "处理成果",
                "items": [
                    {
                        "id": "processing-row-41",
                        "name": "水平叠加纯波数据",
                        "applicableProjects": "",
                        "number": "02",
                        "chineseDirectory": "水平叠加纯波数据",
                        "englishDirectory": "STK_RAW",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-42",
                        "name": "水平叠加成果数据",
                        "applicableProjects": "",
                        "number": "03",
                        "chineseDirectory": "水平叠加成果数据",
                        "englishDirectory": "STK_GAIN",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-43",
                        "name": "叠后偏移纯波数据",
                        "applicableProjects": "",
                        "number": "04",
                        "chineseDirectory": "叠后偏移纯波数据",
                        "englishDirectory": "MIG_RAW",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-44",
                        "name": "叠后偏移成果数据",
                        "applicableProjects": "",
                        "number": "05",
                        "chineseDirectory": "叠后偏移成果数据",
                        "englishDirectory": "MIG_GAIN",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-45",
                        "name": "叠前时间偏移纯波数据",
                        "applicableProjects": "",
                        "number": "06",
                        "chineseDirectory": "叠前时间偏移纯波数据",
                        "englishDirectory": "PSTM_RAW",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-46",
                        "name": "叠前时间偏移成果数据",
                        "applicableProjects": "",
                        "number": "07",
                        "chineseDirectory": "叠前时间偏移成果数据",
                        "englishDirectory": "PSTM_GAIN",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-47",
                        "name": "叠前深度偏移纯波数据",
                        "applicableProjects": "",
                        "number": "08",
                        "chineseDirectory": "叠前深度偏移纯波数据",
                        "englishDirectory": "PSDM_RAW",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-48",
                        "name": "叠前深度偏移成果数据",
                        "applicableProjects": "",
                        "number": "09",
                        "chineseDirectory": "叠前深度偏移成果数据",
                        "englishDirectory": "PSDM_GAIN",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "processing-group-49",
                "name": "道集成果",
                "items": [
                    {
                        "id": "processing-row-49",
                        "name": "原始炮集数据",
                        "applicableProjects": "",
                        "number": "10",
                        "chineseDirectory": "原始炮集数据",
                        "englishDirectory": "TSEQ",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-50",
                        "name": "最终CMP道集数据",
                        "applicableProjects": "",
                        "number": "11",
                        "chineseDirectory": "最终CMP道集数据",
                        "englishDirectory": "CMP",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-51",
                        "name": "叠前时间偏移后CRP道集数据",
                        "applicableProjects": "",
                        "number": "12",
                        "chineseDirectory": "叠前时间偏移后CRP道集数据",
                        "englishDirectory": "PSTM_CRP",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-52",
                        "name": "叠前深度偏移后CIP道集数据",
                        "applicableProjects": "",
                        "number": "13",
                        "chineseDirectory": "叠前深度偏移后CIP道集数据",
                        "englishDirectory": "PSDM_CIP",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "processing-group-53",
                "name": "速度成果",
                "items": [
                    {
                        "id": "processing-row-53",
                        "name": "表层速度模型数据体",
                        "applicableProjects": "",
                        "number": "14",
                        "chineseDirectory": "表层速度模型数据体",
                        "englishDirectory": "VEL_NSM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-54",
                        "name": "最终叠加速度场",
                        "applicableProjects": "",
                        "number": "15",
                        "chineseDirectory": "最终叠加速度场",
                        "englishDirectory": "VEL_STK",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-55",
                        "name": "叠前时间偏移速度场",
                        "applicableProjects": "",
                        "number": "16",
                        "chineseDirectory": "叠前时间偏移速度场",
                        "englishDirectory": "VEL_PSTM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-56",
                        "name": "叠前深度偏移速度场",
                        "applicableProjects": "",
                        "number": "17",
                        "chineseDirectory": "叠前深度偏移速度场",
                        "englishDirectory": "VEL_PSDM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-57",
                        "name": "各向异性参数场",
                        "applicableProjects": "",
                        "number": "18",
                        "chineseDirectory": "各向异性参数场",
                        "englishDirectory": "PARAM_ANISO",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "processing-group-58",
                "name": "辅助成果",
                "items": [
                    {
                        "id": "processing-row-58",
                        "name": "观测系统",
                        "applicableProjects": "",
                        "number": "19",
                        "chineseDirectory": "观测系统",
                        "englishDirectory": "GEOMETRY",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-59",
                        "name": "单炮初至拾取文件",
                        "applicableProjects": "",
                        "number": "20",
                        "chineseDirectory": "单炮初至拾取文件",
                        "englishDirectory": "FB",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-60",
                        "name": "基准面静校正量",
                        "applicableProjects": "",
                        "number": "21",
                        "chineseDirectory": "基准面静校正量",
                        "englishDirectory": "DATUM_STATICS",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-61",
                        "name": "表层Q数据体",
                        "applicableProjects": "",
                        "number": "22",
                        "chineseDirectory": "表层Q数据体",
                        "englishDirectory": "Q_NS",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-62",
                        "name": "最终Q场数据体",
                        "applicableProjects": "",
                        "number": "23",
                        "chineseDirectory": "最终Q场数据体",
                        "englishDirectory": "Q_FINAL",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-63",
                        "name": "叠前深度偏移最终构造模型",
                        "applicableProjects": "",
                        "number": "24",
                        "chineseDirectory": "叠前深度偏移最终构造模型",
                        "englishDirectory": "PSDM_FSM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-64",
                        "name": "工区内井数据",
                        "applicableProjects": "",
                        "number": "25",
                        "chineseDirectory": "工区内井数据",
                        "englishDirectory": "WELL",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "processing-row-65",
                        "name": "工区内VSP成果",
                        "applicableProjects": "",
                        "number": "26",
                        "chineseDirectory": "工区内VSP成果",
                        "englishDirectory": "VSP",
                        "namingRule": "",
                        "notes": "Q、Tar、速度、走廊叠加等"
                    },
                    {
                        "id": "processing-row-66",
                        "name": "高速顶高程文件",
                        "applicableProjects": "",
                        "number": "27",
                        "chineseDirectory": "高速顶高程文件",
                        "englishDirectory": "HVL_ELE",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "processing-group-67",
                "name": "文档成果",
                "items": [
                    {
                        "id": "processing-row-67",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "28",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目设计文字报告、多媒体"
                    },
                    {
                        "id": "processing-row-68",
                        "name": "项目总结文档",
                        "applicableProjects": "",
                        "number": "29",
                        "chineseDirectory": "项目总结文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "项目成果文字报告、多媒体"
                    }
                ]
            }
        ]
    },
    {
        "id": "interpretation",
        "name": "解释",
        "groups": [
            {
                "id": "interpretation-group-69",
                "name": "基本信息",
                "items": [
                    {
                        "id": "interpretation-row-69",
                        "name": "项目信息",
                        "applicableProjects": "",
                        "number": "01",
                        "chineseDirectory": "项目信息",
                        "englishDirectory": "PRO_INFO",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-70",
                        "name": "关联项目",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "interpretation-group-71",
                "name": "井筒数据",
                "items": [
                    {
                        "id": "interpretation-row-71",
                        "name": "井位坐标、轨迹",
                        "applicableProjects": "",
                        "number": "02",
                        "chineseDirectory": "井位坐标、轨迹",
                        "englishDirectory": "WELL",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-72",
                        "name": "测井数据",
                        "applicableProjects": "",
                        "number": "03",
                        "chineseDirectory": "测井数据",
                        "englishDirectory": "WELL_LOG",
                        "namingRule": "",
                        "notes": "曲线、成像、核磁等"
                    },
                    {
                        "id": "interpretation-row-73",
                        "name": "时深关系",
                        "applicableProjects": "",
                        "number": "04",
                        "chineseDirectory": "时深关系",
                        "englishDirectory": "T_D",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-74",
                        "name": "地质分层",
                        "applicableProjects": "",
                        "number": "05",
                        "chineseDirectory": "地质分层",
                        "englishDirectory": "STRAT_DIV",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-75",
                        "name": "测井岩性和油气水解释结论",
                        "applicableProjects": "",
                        "number": "06",
                        "chineseDirectory": "测井岩性和油气水解释结论",
                        "englishDirectory": "LITH_FLUID",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-76",
                        "name": "岩芯",
                        "applicableProjects": "",
                        "number": "07",
                        "chineseDirectory": "岩芯",
                        "englishDirectory": "CORE",
                        "namingRule": "",
                        "notes": "图片、测试结果、解释结论等"
                    },
                    {
                        "id": "interpretation-row-77",
                        "name": "测井沉积微相解释结论",
                        "applicableProjects": "",
                        "number": "08",
                        "chineseDirectory": "测井沉积微相解释结论",
                        "englishDirectory": "LOG_SMF",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-78",
                        "name": "试油成果",
                        "applicableProjects": "",
                        "number": "09",
                        "chineseDirectory": "试油成果",
                        "englishDirectory": "WTR",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "interpretation-group-79",
                "name": "处理数据",
                "items": [
                    {
                        "id": "interpretation-row-79",
                        "name": "叠前深度偏移纯波数据",
                        "applicableProjects": "",
                        "number": "10",
                        "chineseDirectory": "叠前深度偏移纯波数据",
                        "englishDirectory": "PSDM_RAW",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-80",
                        "name": "叠前深度偏移成果数据",
                        "applicableProjects": "",
                        "number": "11",
                        "chineseDirectory": "叠前深度偏移成果数据",
                        "englishDirectory": "PSDM_GAIN",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "interpretation-group-81",
                "name": "解释成果",
                "items": [
                    {
                        "id": "interpretation-row-81",
                        "name": "层位",
                        "applicableProjects": "",
                        "number": "12",
                        "chineseDirectory": "层位",
                        "englishDirectory": "HORIZON",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-82",
                        "name": "断层",
                        "applicableProjects": "",
                        "number": "13",
                        "chineseDirectory": "断层",
                        "englishDirectory": "FAULT",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-83",
                        "name": "断层多边形",
                        "applicableProjects": "",
                        "number": "14",
                        "chineseDirectory": "断层多边形",
                        "englishDirectory": "POLYGON",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-84",
                        "name": "地质体",
                        "applicableProjects": "",
                        "number": "15",
                        "chineseDirectory": "地质体",
                        "englishDirectory": "BODY",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-85",
                        "name": "地震相",
                        "applicableProjects": "",
                        "number": "16",
                        "chineseDirectory": "地震相",
                        "englishDirectory": "SEIS_FAC",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-86",
                        "name": "沉积相",
                        "applicableProjects": "",
                        "number": "17",
                        "chineseDirectory": "沉积相",
                        "englishDirectory": "DEP_FAC",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-87",
                        "name": "地震属性",
                        "applicableProjects": "",
                        "number": "18",
                        "chineseDirectory": "地震属性",
                        "englishDirectory": "ATTRIBUTE",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "interpretation-group-88",
                "name": "反演与建模成果",
                "items": [
                    {
                        "id": "interpretation-row-88",
                        "name": "叠后反演结果",
                        "applicableProjects": "",
                        "number": "19",
                        "chineseDirectory": "叠后反演结果",
                        "englishDirectory": "INVERSION",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-89",
                        "name": "全套速度场",
                        "applicableProjects": "",
                        "number": "20",
                        "chineseDirectory": "全套速度场",
                        "englishDirectory": "VELOCITY",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "interpretation-group-90",
                "name": "综合成图成果",
                "items": [
                    {
                        "id": "interpretation-row-90",
                        "name": "地层厚度图",
                        "applicableProjects": "",
                        "number": "21",
                        "chineseDirectory": "地层厚度图",
                        "englishDirectory": "IM",
                        "namingRule": "",
                        "notes": "Isopach map（等厚图，地层真厚度图）"
                    },
                    {
                        "id": "interpretation-row-91",
                        "name": "时间构造图",
                        "applicableProjects": "",
                        "number": "22",
                        "chineseDirectory": "时间构造图",
                        "englishDirectory": "TSM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-92",
                        "name": "深度构造图",
                        "applicableProjects": "",
                        "number": "23",
                        "chineseDirectory": "深度构造图",
                        "englishDirectory": "DSM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "interpretation-row-93",
                        "name": "其他成图",
                        "applicableProjects": "",
                        "number": "24",
                        "chineseDirectory": "其他成图",
                        "englishDirectory": "OTHERMAPS",
                        "namingRule": "",
                        "notes": "Other maps"
                    }
                ]
            },
            {
                "id": "interpretation-group-94",
                "name": "文档成果",
                "items": [
                    {
                        "id": "interpretation-row-94",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "25",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目合同、项目设计文字报告、项目设计多媒体"
                    },
                    {
                        "id": "interpretation-row-95",
                        "name": "项目总结文档",
                        "applicableProjects": "",
                        "number": "26",
                        "chineseDirectory": "项目总结文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "验收文字报告、验收附图册、验收多媒体、验收书、验收人员名单"
                    }
                ]
            }
        ]
    },
    {
        "id": "wellbore",
        "name": "井筒",
        "groups": [
            {
                "id": "wellbore-group-96",
                "name": "基本信息",
                "items": [
                    {
                        "id": "wellbore-row-96",
                        "name": "项目信息",
                        "applicableProjects": "",
                        "number": "01",
                        "chineseDirectory": "项目信息",
                        "englishDirectory": "PRO_INFO",
                        "namingRule": "",
                        "notes": "测井名称、版本号、起始深度、终止深度、步长、无效值、甲方、井号、场地、地区、省份、县、州、国家、服务公司、日期、#ID、API数、东坐标、北坐标、纬度、经度、方钻杆补心高程、钻台高程、井口高程、地面高程、备注"
                    },
                    {
                        "id": "wellbore-row-97",
                        "name": "关联项目",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "wellbore-group-98",
                "name": "环境参数",
                "items": [
                    {
                        "id": "wellbore-row-98",
                        "name": "",
                        "applicableProjects": "",
                        "number": "02",
                        "chineseDirectory": "",
                        "englishDirectory": "PARAM_ENV",
                        "namingRule": "",
                        "notes": "井号、地层温度阶梯、上浮地层压力阶梯、油藏压力阶梯、海水深度、海水温度阶梯"
                    }
                ]
            },
            {
                "id": "wellbore-group-99",
                "name": "井轨迹",
                "items": [
                    {
                        "id": "wellbore-row-99",
                        "name": "",
                        "applicableProjects": "",
                        "number": "03",
                        "chineseDirectory": "",
                        "englishDirectory": "WELL",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "wellbore-group-100",
                "name": "岩性录井",
                "items": [
                    {
                        "id": "wellbore-row-100",
                        "name": "",
                        "applicableProjects": "",
                        "number": "04",
                        "chineseDirectory": "",
                        "englishDirectory": "LITH_LOG",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "wellbore-group-101",
                "name": "测井结构",
                "items": [
                    {
                        "id": "wellbore-row-101",
                        "name": "测井数据",
                        "applicableProjects": "",
                        "number": "05",
                        "chineseDirectory": "测井数据",
                        "englishDirectory": "WELL_LOG",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-102",
                        "name": "岩石物理",
                        "applicableProjects": "",
                        "number": "06",
                        "chineseDirectory": "岩石物理",
                        "englishDirectory": "ROCK_PHYSICS",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-103",
                        "name": "分层",
                        "applicableProjects": "",
                        "number": "07",
                        "chineseDirectory": "分层",
                        "englishDirectory": "TOP",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-104",
                        "name": "速度分析",
                        "applicableProjects": "",
                        "number": "08",
                        "chineseDirectory": "速度分析",
                        "englishDirectory": "VEL_ANALYSIS",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-105",
                        "name": "时深关系",
                        "applicableProjects": "",
                        "number": "09",
                        "chineseDirectory": "时深关系",
                        "englishDirectory": "T_D",
                        "namingRule": "",
                        "notes": "Time-Depth Relationship"
                    },
                    {
                        "id": "wellbore-row-106",
                        "name": "合成记录",
                        "applicableProjects": "",
                        "number": "10",
                        "chineseDirectory": "合成记录",
                        "englishDirectory": "SYNTHETIC",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-107",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "11",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目合同、项目设计文字报告、项目设计多媒体"
                    },
                    {
                        "id": "wellbore-row-108",
                        "name": "项目成果文档",
                        "applicableProjects": "",
                        "number": "12",
                        "chineseDirectory": "项目成果文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "验收文字报告、验收附图册、验收多媒体、验收书、验收人员名单"
                    }
                ]
            },
            {
                "id": "wellbore-group-109",
                "name": "VSP",
                "items": [
                    {
                        "id": "wellbore-row-109",
                        "name": "激发参数",
                        "applicableProjects": "",
                        "number": "13",
                        "chineseDirectory": "激发参数",
                        "englishDirectory": "SOURCE_PARAM",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-110",
                        "name": "观测系统",
                        "applicableProjects": "",
                        "number": "14",
                        "chineseDirectory": "观测系统",
                        "englishDirectory": "GEOMETRY",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-111",
                        "name": "炮集数据",
                        "applicableProjects": "",
                        "number": "15",
                        "chineseDirectory": "炮集数据",
                        "englishDirectory": "SHOT_GATHER",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-112",
                        "name": "初至时间",
                        "applicableProjects": "",
                        "number": "16",
                        "chineseDirectory": "初至时间",
                        "englishDirectory": "FB",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-113",
                        "name": "波场分离",
                        "applicableProjects": "",
                        "number": "17",
                        "chineseDirectory": "波场分离",
                        "englishDirectory": "WAVEFIELD_SEPARATION",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-114",
                        "name": "走廊叠加",
                        "applicableProjects": "",
                        "number": "18",
                        "chineseDirectory": "走廊叠加",
                        "englishDirectory": "CORRIDOR_STACK",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-115",
                        "name": "偏移剖面",
                        "applicableProjects": "",
                        "number": "19",
                        "chineseDirectory": "偏移剖面",
                        "englishDirectory": "MIG_SECTION",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "wellbore-row-116",
                        "name": "反演数据",
                        "applicableProjects": "",
                        "number": "20",
                        "chineseDirectory": "反演数据",
                        "englishDirectory": "INVERSION",
                        "namingRule": "",
                        "notes": "Inversion Data"
                    },
                    {
                        "id": "wellbore-row-117",
                        "name": "时深表",
                        "applicableProjects": "",
                        "number": "21",
                        "chineseDirectory": "时深表",
                        "englishDirectory": "T_D_TABLE",
                        "namingRule": "",
                        "notes": "Time-Depth Table"
                    },
                    {
                        "id": "wellbore-row-118",
                        "name": "质控数据",
                        "applicableProjects": "",
                        "number": "22",
                        "chineseDirectory": "质控数据",
                        "englishDirectory": "QC_DATA",
                        "namingRule": "",
                        "notes": "Quality Control Data"
                    },
                    {
                        "id": "wellbore-row-119",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "23",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目合同、项目设计文字报告、项目设计多媒体"
                    },
                    {
                        "id": "wellbore-row-120",
                        "name": "项目成果文档",
                        "applicableProjects": "",
                        "number": "24",
                        "chineseDirectory": "项目成果文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "验收文字报告、验收附图册、验收多媒体、验收书、验收人员名单"
                    }
                ]
            }
        ]
    },
    {
        "id": "nonseismic",
        "name": "非地震",
        "groups": [
            {
                "id": "nonseismic-group-121",
                "name": "基本信息",
                "items": [
                    {
                        "id": "nonseismic-row-121",
                        "name": "项目信息",
                        "applicableProjects": "",
                        "number": "01",
                        "chineseDirectory": "项目信息",
                        "englishDirectory": "PRO_INFO",
                        "namingRule": "",
                        "notes": ""
                    },
                    {
                        "id": "nonseismic-row-122",
                        "name": "关联项目",
                        "applicableProjects": "",
                        "number": "",
                        "chineseDirectory": "",
                        "englishDirectory": "",
                        "namingRule": "",
                        "notes": ""
                    }
                ]
            },
            {
                "id": "nonseismic-group-123",
                "name": "磁力",
                "items": [
                    {
                        "id": "nonseismic-row-123",
                        "name": "原始数据",
                        "applicableProjects": "",
                        "number": "02",
                        "chineseDirectory": "原始数据",
                        "englishDirectory": "MAG_RAW_DATA",
                        "namingRule": "",
                        "notes": "Magnetic Raw Data"
                    },
                    {
                        "id": "nonseismic-row-124",
                        "name": "磁力ΔT异常图",
                        "applicableProjects": "",
                        "number": "03",
                        "chineseDirectory": "磁力ΔT异常图",
                        "englishDirectory": "MAG_DT_ANOM",
                        "namingRule": "",
                        "notes": "Magnetic Delta-T Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-125",
                        "name": "化极磁力异常图",
                        "applicableProjects": "",
                        "number": "04",
                        "chineseDirectory": "化极磁力异常图",
                        "englishDirectory": "MAG_RTP_ANOM",
                        "namingRule": "",
                        "notes": "Magnetic Reduction-To-Pole Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-126",
                        "name": "区域磁力异常图",
                        "applicableProjects": "",
                        "number": "05",
                        "chineseDirectory": "区域磁力异常图",
                        "englishDirectory": "MAG_REG_ANOM",
                        "namingRule": "",
                        "notes": "Magnetic Regional Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-127",
                        "name": "剩余磁力异常图",
                        "applicableProjects": "",
                        "number": "06",
                        "chineseDirectory": "剩余磁力异常图",
                        "englishDirectory": "MAG_RES_ANOM",
                        "namingRule": "",
                        "notes": "Magnetic Residual Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-128",
                        "name": "局部磁力异常图",
                        "applicableProjects": "",
                        "number": "07",
                        "chineseDirectory": "局部磁力异常图",
                        "englishDirectory": "MAG_LOC_ANOM",
                        "namingRule": "",
                        "notes": "Magnetic Local Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-129",
                        "name": "磁化率水平切片异常图",
                        "applicableProjects": "",
                        "number": "08",
                        "chineseDirectory": "磁化率水平切片异常图",
                        "englishDirectory": "MAG_SUSC_SLICE",
                        "namingRule": "",
                        "notes": "Magnetic Susceptibility Horizontal Slice"
                    }
                ]
            },
            {
                "id": "nonseismic-group-130",
                "name": "大地电磁",
                "items": [
                    {
                        "id": "nonseismic-row-130",
                        "name": "视电阻率曲线类型分布图",
                        "applicableProjects": "",
                        "number": "09",
                        "chineseDirectory": "视电阻率曲线类型分布图",
                        "englishDirectory": "MT_APP_RES_CURVE",
                        "namingRule": "",
                        "notes": "Magnetotelluric Apparent Resistivity Curve Type Map"
                    },
                    {
                        "id": "nonseismic-row-131",
                        "name": "视电阻率、相位断面图",
                        "applicableProjects": "",
                        "number": "10",
                        "chineseDirectory": "视电阻率、相位断面图",
                        "englishDirectory": "MT_APP_RES_PHASE",
                        "namingRule": "",
                        "notes": "Magnetotelluric Apparent Resistivity & Phase Section"
                    },
                    {
                        "id": "nonseismic-row-132",
                        "name": "总纵电导图",
                        "applicableProjects": "",
                        "number": "11",
                        "chineseDirectory": "总纵电导图",
                        "englishDirectory": "MT_TOTAL_COND",
                        "namingRule": "",
                        "notes": "Magnetotelluric Total Longitudinal Conductance Map"
                    },
                    {
                        "id": "nonseismic-row-133",
                        "name": "深度-电阻率解释剖面图",
                        "applicableProjects": "",
                        "number": "12",
                        "chineseDirectory": "深度-电阻率解释剖面图",
                        "englishDirectory": "MT_DEPTH_RES",
                        "namingRule": "",
                        "notes": "Magnetotelluric Depth-Resistivity Interpretation Section"
                    },
                    {
                        "id": "nonseismic-row-134",
                        "name": "主要电性层埋深图",
                        "applicableProjects": "",
                        "number": "13",
                        "chineseDirectory": "主要电性层埋深图",
                        "englishDirectory": "MT_ELEC_DEPTH",
                        "namingRule": "",
                        "notes": "Magnetotelluric Main Electric Layer Depth Map"
                    },
                    {
                        "id": "nonseismic-row-135",
                        "name": "电阻率三维切片图",
                        "applicableProjects": "",
                        "number": "14",
                        "chineseDirectory": "电阻率三维切片图",
                        "englishDirectory": "MT_RES_3D",
                        "namingRule": "",
                        "notes": "Magnetotelluric Resistivity 3D Slice"
                    },
                    {
                        "id": "nonseismic-row-136",
                        "name": "标志层空间展布透视图",
                        "applicableProjects": "",
                        "number": "15",
                        "chineseDirectory": "标志层空间展布透视图",
                        "englishDirectory": "MT_MARKER_HORIZON_3D",
                        "namingRule": "",
                        "notes": "Magnetotelluric Marker Horizon 3D Perspective View"
                    }
                ]
            },
            {
                "id": "nonseismic-group-137",
                "name": "时频电磁",
                "items": [
                    {
                        "id": "nonseismic-row-137",
                        "name": "视电阻率拟断面图",
                        "applicableProjects": "",
                        "number": "16",
                        "chineseDirectory": "视电阻率拟断面图",
                        "englishDirectory": "TFEM_RES_PSEUDO",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Apparent Resistivity Pseudo-Section"
                    },
                    {
                        "id": "nonseismic-row-138",
                        "name": "电阻率自由反演剖面图",
                        "applicableProjects": "",
                        "number": "17",
                        "chineseDirectory": "电阻率自由反演剖面图",
                        "englishDirectory": "TFEM_RES_FREE_INV",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Resistivity Free Inversion Section"
                    },
                    {
                        "id": "nonseismic-row-139",
                        "name": "电阻率约束反演剖面图",
                        "applicableProjects": "",
                        "number": "18",
                        "chineseDirectory": "电阻率约束反演剖面图",
                        "englishDirectory": "TFEM_RES_CONS_INV",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Resistivity Constrained Inversion Section"
                    },
                    {
                        "id": "nonseismic-row-140",
                        "name": "电阻率三维可视化图件",
                        "applicableProjects": "",
                        "number": "19",
                        "chineseDirectory": "电阻率三维可视化图件",
                        "englishDirectory": "TFEM_RES_3D",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Resistivity 3D Visualization"
                    },
                    {
                        "id": "nonseismic-row-141",
                        "name": "主要电性层电阻率平面图",
                        "applicableProjects": "",
                        "number": "20",
                        "chineseDirectory": "主要电性层电阻率平面图",
                        "englishDirectory": "TFEM_ELEC_RES",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Electric Layer Resistivity Map"
                    },
                    {
                        "id": "nonseismic-row-142",
                        "name": "主要目的层极化率平面图",
                        "applicableProjects": "",
                        "number": "21",
                        "chineseDirectory": "主要目的层极化率平面图",
                        "englishDirectory": "TFEM_POLAR",
                        "namingRule": "",
                        "notes": "Time-Frequency EM Main Target Layer Polarizability Map"
                    }
                ]
            },
            {
                "id": "nonseismic-group-143",
                "name": "化探",
                "items": [
                    {
                        "id": "nonseismic-row-143",
                        "name": "原始数据",
                        "applicableProjects": "",
                        "number": "22",
                        "chineseDirectory": "原始数据",
                        "englishDirectory": "GEOCHEM_RAW_DATA",
                        "namingRule": "",
                        "notes": "Geochemical Raw Data"
                    },
                    {
                        "id": "nonseismic-row-144",
                        "name": "样品异常图",
                        "applicableProjects": "",
                        "number": "23",
                        "chineseDirectory": "样品异常图",
                        "englishDirectory": "GEOCHEM_ANOM",
                        "namingRule": "",
                        "notes": "Geochemical Sample Anomaly Map"
                    },
                    {
                        "id": "nonseismic-row-145",
                        "name": "构造叠合图",
                        "applicableProjects": "",
                        "number": "24",
                        "chineseDirectory": "构造叠合图",
                        "englishDirectory": "GEOCHEM_TECT",
                        "namingRule": "",
                        "notes": "Geochemical Tectonic Overlay Map"
                    }
                ]
            },
            {
                "id": "nonseismic-group-146",
                "name": "解释成果",
                "items": [
                    {
                        "id": "nonseismic-row-146",
                        "name": "综合地质解释剖面图",
                        "applicableProjects": "",
                        "number": "25",
                        "chineseDirectory": "综合地质解释剖面图",
                        "englishDirectory": "INTERP_GEO_SECT",
                        "namingRule": "",
                        "notes": "Integrated Geological Interpretation Section"
                    },
                    {
                        "id": "nonseismic-row-147",
                        "name": "主要沉积盖层厚度图",
                        "applicableProjects": "",
                        "number": "26",
                        "chineseDirectory": "主要沉积盖层厚度图",
                        "englishDirectory": "INTERP_SED_THICK",
                        "namingRule": "",
                        "notes": "Main Sedimentary Cover Thickness Map"
                    },
                    {
                        "id": "nonseismic-row-148",
                        "name": "磁性基底埋深图",
                        "applicableProjects": "",
                        "number": "27",
                        "chineseDirectory": "磁性基底埋深图",
                        "englishDirectory": "INTERP_MAG_BASEMENT",
                        "namingRule": "",
                        "notes": "Magnetic Basement Burial Depth Map"
                    },
                    {
                        "id": "nonseismic-row-149",
                        "name": "断裂系统（分布）图",
                        "applicableProjects": "",
                        "number": "28",
                        "chineseDirectory": "断裂系统（分布）图",
                        "englishDirectory": "INTERP_FAULT_SYSTEM",
                        "namingRule": "",
                        "notes": "Fault System Distribution Map"
                    },
                    {
                        "id": "nonseismic-row-150",
                        "name": "局部构造预测图",
                        "applicableProjects": "",
                        "number": "29",
                        "chineseDirectory": "局部构造预测图",
                        "englishDirectory": "INTERP_LOCAL_STRUCT_PRED",
                        "namingRule": "",
                        "notes": "Local Structure Prediction Map"
                    },
                    {
                        "id": "nonseismic-row-151",
                        "name": "火成岩分布（岩性预测）图",
                        "applicableProjects": "",
                        "number": "30",
                        "chineseDirectory": "火成岩分布（岩性预测）图",
                        "englishDirectory": "INTERP_IGNEOUS_MAP",
                        "namingRule": "",
                        "notes": "Igneous Rock Distribution (Lithology Prediction) Map"
                    },
                    {
                        "id": "nonseismic-row-152",
                        "name": "构造单元划分图",
                        "applicableProjects": "",
                        "number": "31",
                        "chineseDirectory": "构造单元划分图",
                        "englishDirectory": "INTERP_STRUCT_UNIT",
                        "namingRule": "",
                        "notes": "Structural Unit Division Map"
                    },
                    {
                        "id": "nonseismic-row-153",
                        "name": "含油气远景评价图",
                        "applicableProjects": "",
                        "number": "32",
                        "chineseDirectory": "含油气远景评价图",
                        "englishDirectory": "INTERP_OIL_GAS_PROSPECT",
                        "namingRule": "",
                        "notes": "Oil & Gas Prospect Evaluation Map"
                    },
                    {
                        "id": "nonseismic-row-154",
                        "name": "三维可视化图",
                        "applicableProjects": "",
                        "number": "33",
                        "chineseDirectory": "三维可视化图",
                        "englishDirectory": "INTERP_3D_VIS",
                        "namingRule": "",
                        "notes": "3D Visualization"
                    }
                ]
            },
            {
                "id": "nonseismic-group-155",
                "name": "文档成果",
                "items": [
                    {
                        "id": "nonseismic-row-155",
                        "name": "项目设计文档",
                        "applicableProjects": "",
                        "number": "34",
                        "chineseDirectory": "项目设计文档",
                        "englishDirectory": "DESIGN_DOC",
                        "namingRule": "",
                        "notes": "项目合同、项目设计文字报告、项目设计多媒体"
                    },
                    {
                        "id": "nonseismic-row-156",
                        "name": "项目总结文档",
                        "applicableProjects": "",
                        "number": "35",
                        "chineseDirectory": "项目总结文档",
                        "englishDirectory": "FINAL_DOC",
                        "namingRule": "",
                        "notes": "验收文字报告、验收附图册、验收多媒体、验收书、验收人员名单"
                    }
                ]
            }
        ]
    }
];

let savedResultTypes = structuredClone(RESULT_TYPE_CATEGORIES);

// Match the other baseline demo data: in memory until the page reloads.
export function loadResultTypes(): ResultTypeCategory[] {
    return structuredClone(savedResultTypes);
}

export function saveResultTypes(categories: ResultTypeCategory[]): void {
    savedResultTypes = structuredClone(categories);
}
