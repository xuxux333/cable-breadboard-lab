window.CIRCUIT_REFERENCE = {
  "scope": "Inventory-constrained functional connection diagram; FPGA square with logical inputs/outputs only; no added components",
  "chips": {
    "555": {
      "type": "NE555",
      "pins": {
        "1": "GND",
        "2": "TIME",
        "3": "clk",
        "4": "+5V",
        "5": "CV",
        "6": "TIME",
        "7": "DIS",
        "8": "+5V"
      },
      "package": {
        "pins": 8,
        "leadPitchMm": 2.54,
        "nominalOverallLengthMm": 9.81,
        "pinOneMarker": "左上圆点与上端半圆缺口",
        "numbering": "从顶视图左上1脚逆时针编号",
        "nominalOverallWidthMm": 9.43,
        "type": "PDIP",
        "view": "top",
        "rowSpacingMm": 7.62
      },
      "sourceId": "ti-ne555",
      "pinLabels": {
        "1": "GND",
        "2": "TRIG",
        "3": "OUT",
        "4": "RESET",
        "5": "CONT",
        "6": "THRES",
        "7": "DISCH",
        "8": "VCC"
      }
    },
    "MUX": {
      "type": "CD4051",
      "pins": {
        "1": "CH4",
        "2": "CH6",
        "3": "VX",
        "4": "CH7",
        "5": "CH5",
        "6": "GND",
        "7": "GND",
        "8": "GND",
        "9": "SEL_C",
        "10": "SEL_B",
        "11": "SEL_A",
        "12": "CH3",
        "13": "CH0",
        "14": "CH1",
        "15": "CH2",
        "16": "+5V"
      },
      "packageReferencePart": "CD4051BE（PDIP-16外形参考，实物后缀未确认）",
      "package": {
        "pins": 16,
        "leadPitchMm": 2.54,
        "nominalOverallLengthMm": 19.3,
        "pinOneMarker": "左上圆点与上端半圆缺口",
        "numbering": "从顶视图左上1脚逆时针编号",
        "nominalOverallWidthMm": 9.4,
        "type": "PDIP",
        "view": "top",
        "rowSpacingMm": 7.62
      },
      "sourceId": "ti-cd4051",
      "pinLabels": {
        "1": "CH4",
        "2": "CH6",
        "3": "COM",
        "4": "CH7",
        "5": "CH5",
        "6": "INH",
        "7": "VEE",
        "8": "VSS",
        "9": "C",
        "10": "B",
        "11": "A",
        "12": "CH3",
        "13": "CH0",
        "14": "CH1",
        "15": "CH2",
        "16": "VDD"
      }
    },
    "ADC": {
      "type": "ADC0804",
      "pins": {
        "1": "adc_cs_n",
        "2": "adc_rd_n",
        "3": "adc_wr_n",
        "4": "ADC_CLK",
        "5": "intr_n",
        "6": "VX",
        "7": "GND",
        "8": "GND",
        "9": "NC_VREF",
        "10": "GND",
        "11": "adc_code[4]",
        "12": "adc_code[3]",
        "13": "adc_code[2]",
        "14": "adc_code[1]",
        "15": "adc_code[0]",
        "16": "NC_DB2",
        "17": "NC_DB1",
        "18": "NC_DB0",
        "19": "ADC_RCLK",
        "20": "+5V"
      },
      "package": {
        "nominalBodyWidthMm": 6.604,
        "pins": 20,
        "leadPitchMm": 2.54,
        "numbering": "从顶视图左上1脚逆时针编号",
        "pinOneMarker": "左上圆点与上端半圆缺口",
        "type": "PDIP",
        "view": "top",
        "rowSpacingMm": 7.62,
        "nominalBodyLengthMm": 26.073
      },
      "sourceId": "ti-adc0804",
      "pinLabels": {
        "1": "/CS",
        "2": "/RD",
        "3": "/WR",
        "4": "CLK IN",
        "5": "/INTR",
        "6": "VIN(+)",
        "7": "VIN(-)",
        "8": "AGND",
        "9": "VREF/2",
        "10": "DGND",
        "11": "DB7",
        "12": "DB6",
        "13": "DB5",
        "14": "DB4",
        "15": "DB3",
        "16": "DB2",
        "17": "DB1",
        "18": "DB0",
        "19": "CLK R",
        "20": "VCC"
      }
    },
    "UNITS": {
      "type": "CD4511BE",
      "pins": {
        "1": "bcd_units[1]",
        "2": "bcd_units[2]",
        "3": "DISPLAY_VDD",
        "4": "blank_n",
        "5": "GND",
        "6": "bcd_units[3]",
        "7": "bcd_units[0]",
        "8": "GND",
        "9": "U_e",
        "10": "U_d",
        "11": "U_c",
        "12": "U_b",
        "13": "U_a",
        "14": "U_g",
        "15": "U_f",
        "16": "DISPLAY_VDD"
      },
      "package": {
        "pins": 16,
        "leadPitchMm": 2.54,
        "nominalOverallLengthMm": 19.3,
        "pinOneMarker": "左上圆点与上端半圆缺口",
        "numbering": "从顶视图左上1脚逆时针编号",
        "nominalOverallWidthMm": 9.4,
        "type": "PDIP",
        "view": "top",
        "rowSpacingMm": 7.62
      },
      "pinLabels": {
        "1": "B",
        "2": "C",
        "3": "/LT",
        "4": "/BI",
        "5": "LE",
        "6": "D",
        "7": "A",
        "8": "VSS",
        "9": "e",
        "10": "d",
        "11": "c",
        "12": "b",
        "13": "a",
        "14": "g",
        "15": "f",
        "16": "VDD"
      },
      "sourceId": "ti-cd4511"
    },
    "TENS": {
      "type": "CD4511BE",
      "pins": {
        "1": "bcd_tens[1]",
        "2": "GND",
        "3": "DISPLAY_VDD",
        "4": "blank_n",
        "5": "GND",
        "6": "GND",
        "7": "bcd_tens[0]",
        "8": "GND",
        "9": "T_e",
        "10": "T_d",
        "11": "T_c",
        "12": "T_b",
        "13": "T_a",
        "14": "T_g",
        "15": "T_f",
        "16": "DISPLAY_VDD"
      },
      "package": {
        "pins": 16,
        "leadPitchMm": 2.54,
        "nominalOverallLengthMm": 19.3,
        "pinOneMarker": "左上圆点与上端半圆缺口",
        "numbering": "从顶视图左上1脚逆时针编号",
        "nominalOverallWidthMm": 9.4,
        "type": "PDIP",
        "view": "top",
        "rowSpacingMm": 7.62
      },
      "pinLabels": {
        "1": "B",
        "2": "C",
        "3": "/LT",
        "4": "/BI",
        "5": "LE",
        "6": "D",
        "7": "A",
        "8": "VSS",
        "9": "e",
        "10": "d",
        "11": "c",
        "12": "b",
        "13": "a",
        "14": "g",
        "15": "f",
        "16": "VDD"
      },
      "sourceId": "ti-cd4511"
    }
  },
  "fpga_ports": [
    {
      "端口": "adc_code[0]",
      "方向": "输入",
      "对端": "ADC DB3（15脚）",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_code[1]",
      "方向": "输入",
      "对端": "ADC DB4（14脚）",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_code[2]",
      "方向": "输入",
      "对端": "ADC DB5（13脚）",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_code[3]",
      "方向": "输入",
      "对端": "ADC DB6（12脚）",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_code[4]",
      "方向": "输入",
      "对端": "ADC DB7（11脚）",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "intr_n",
      "方向": "输入",
      "对端": "ADC /INTR（5脚）",
      "说明": "低有效",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "clk",
      "方向": "输入",
      "对端": "NE555 OUT（3脚）",
      "说明": "约15kHz；内部分频÷30000约2s",
      "开发板脚号": "17（课程允许17/18/19，预选17；并非封装P17）"
    },
    {
      "端口": "rst_n",
      "方向": "输入",
      "对端": "目标板现有复位信号",
      "说明": "不新增外部复位器件",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_cs_n",
      "方向": "输出",
      "对端": "ADC 1脚",
      "说明": "低有效",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_rd_n",
      "方向": "输出",
      "对端": "ADC 2脚",
      "说明": "低有效",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "adc_wr_n",
      "方向": "输出",
      "对端": "ADC 3脚",
      "说明": "低有效",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_units[0]",
      "方向": "输出",
      "对端": "个位4511 7脚",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_units[1]",
      "方向": "输出",
      "对端": "个位4511 1脚",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_units[2]",
      "方向": "输出",
      "对端": "个位4511 2脚",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_units[3]",
      "方向": "输出",
      "对端": "个位4511 6脚",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_tens[0]",
      "方向": "输出",
      "对端": "十位4511 7脚",
      "说明": "高两位不用，十位C/D接地",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "bcd_tens[1]",
      "方向": "输出",
      "对端": "十位4511 1脚",
      "说明": "高两位不用，十位C/D接地",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "blank_n",
      "方向": "输出",
      "对端": "两片4511的4脚 /BI",
      "说明": "低有效消隐",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "led_short",
      "方向": "输出",
      "对端": "现有1k限流电阻→短路LED",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    },
    {
      "端口": "led_open",
      "方向": "输出",
      "对端": "现有1k限流电阻→开路LED",
      "说明": "",
      "开发板脚号": "待实物引脚表确认"
    }
  ],
  "passives": [
    {
      "ref": "RX1",
      "kind": "R",
      "value": "4769ohm",
      "nets": [
        "CH0",
        "GND"
      ]
    },
    {
      "ref": "RX2",
      "kind": "R",
      "value": "8325ohm",
      "nets": [
        "CH1",
        "GND"
      ]
    },
    {
      "ref": "RX3",
      "kind": "R",
      "value": "12131ohm",
      "nets": [
        "CH2",
        "GND"
      ]
    },
    {
      "ref": "RX4",
      "kind": "R",
      "value": "16214ohm",
      "nets": [
        "CH3",
        "GND"
      ]
    },
    {
      "ref": "RX5",
      "kind": "R",
      "value": "20605ohm",
      "nets": [
        "CH4",
        "GND"
      ]
    },
    {
      "ref": "RX6",
      "kind": "R",
      "value": "25341ohm",
      "nets": [
        "CH5",
        "GND"
      ]
    },
    {
      "ref": "RX7",
      "kind": "R",
      "value": "30463ohm",
      "nets": [
        "CH6",
        "GND"
      ]
    },
    {
      "ref": "RX8",
      "kind": "R",
      "value": "36021ohm",
      "nets": [
        "CH7",
        "GND"
      ]
    },
    {
      "ref": "R_PULL",
      "kind": "R",
      "value": "100k",
      "nets": [
        "+5V",
        "VX"
      ]
    },
    {
      "ref": "R_CLK",
      "kind": "R",
      "value": "10k",
      "nets": [
        "ADC_RCLK",
        "ADC_CLK"
      ]
    },
    {
      "ref": "C_CLK",
      "kind": "C",
      "value": "150pF",
      "nets": [
        "ADC_CLK",
        "GND"
      ]
    },
    {
      "ref": "C_ADC",
      "kind": "C",
      "value": "100nF",
      "nets": [
        "+5V",
        "GND"
      ]
    },
    {
      "ref": "RA",
      "kind": "R",
      "value": "1.8k",
      "nets": [
        "+5V",
        "DIS"
      ]
    },
    {
      "ref": "RB",
      "kind": "R",
      "value": "3.9k",
      "nets": [
        "DIS",
        "TIME"
      ]
    },
    {
      "ref": "CT",
      "kind": "C",
      "value": "10nF",
      "nets": [
        "TIME",
        "GND"
      ]
    },
    {
      "ref": "C_CV",
      "kind": "C",
      "value": "10nF",
      "nets": [
        "CV",
        "GND"
      ]
    },
    {
      "ref": "R_SHORT",
      "kind": "R",
      "value": "1k",
      "nets": [
        "led_short",
        "LED_SHORT_A"
      ]
    },
    {
      "ref": "R_OPEN",
      "kind": "R",
      "value": "1k",
      "nets": [
        "led_open",
        "LED_OPEN_A"
      ]
    },
    {
      "ref": "LED_SHORT",
      "kind": "LED",
      "value": "RED",
      "nets": [
        "LED_SHORT_A",
        "GND"
      ]
    },
    {
      "ref": "LED_OPEN",
      "kind": "LED",
      "value": "RED",
      "nets": [
        "LED_OPEN_A",
        "GND"
      ]
    },
    {
      "ref": "RTC3",
      "kind": "R",
      "value": "1k",
      "nets": [
        "T_COM3",
        "GND"
      ],
      "confirmedBy": "User after teacher confirmation"
    },
    {
      "ref": "RTC8",
      "kind": "R",
      "value": "1k",
      "nets": [
        "T_COM8",
        "GND"
      ],
      "confirmedBy": "User after teacher confirmation"
    },
    {
      "ref": "RUC3",
      "kind": "R",
      "value": "1k",
      "nets": [
        "U_COM3",
        "GND"
      ],
      "confirmedBy": "User after teacher confirmation"
    },
    {
      "ref": "RUC8",
      "kind": "R",
      "value": "1k",
      "nets": [
        "U_COM8",
        "GND"
      ],
      "confirmedBy": "User after teacher confirmation"
    }
  ],
  "displays": {
    "units": {
      "type": "7SEG-COM-CATHODE",
      "segments": {
        "a": "U_a",
        "b": "U_b",
        "c": "U_c",
        "d": "U_d",
        "e": "U_e",
        "f": "U_f",
        "g": "U_g"
      },
      "physicalPinNumbersConfirmed": false,
      "note": "按用户向老师确认：3、8脚各经独立1kΩ接地；4511到a–g直接连接，其他段脚的物理编号待确认。",
      "commonPins": {
        "3": "U_COM3",
        "8": "U_COM8"
      },
      "confirmedPhysicalPins": {
        "3": "common cathode",
        "8": "common cathode"
      }
    },
    "tens": {
      "type": "7SEG-COM-CATHODE",
      "segments": {
        "a": "T_a",
        "b": "T_b",
        "c": "T_c",
        "d": "T_d",
        "e": "T_e",
        "f": "T_f",
        "g": "T_g"
      },
      "physicalPinNumbersConfirmed": false,
      "note": "按用户向老师确认：3、8脚各经独立1kΩ接地；4511到a–g直接连接，其他段脚的物理编号待确认。",
      "commonPins": {
        "3": "T_COM3",
        "8": "T_COM8"
      },
      "confirmedPhysicalPins": {
        "3": "common cathode",
        "8": "common cathode"
      }
    }
  },
  "selection": {
    "part": "existing 8-bit DIP switch",
    "quantity": 1,
    "used_bits": 3,
    "nets": [
      "SEL_A",
      "SEL_B",
      "SEL_C"
    ],
    "contactType": "SPST DIP-8",
    "actualOffBiasConfirmed": false,
    "logicalBitOrder": [
      "SEL_A",
      "SEL_B",
      "SEL_C"
    ],
    "truthTable": [
      {
        "switchValue": 0,
        "b": 0,
        "cableNumber": 1,
        "a": 0,
        "selectedMuxChannel": "CH0",
        "c": 0
      },
      {
        "switchValue": 1,
        "b": 0,
        "cableNumber": 2,
        "a": 1,
        "selectedMuxChannel": "CH1",
        "c": 0
      },
      {
        "switchValue": 2,
        "b": 1,
        "cableNumber": 3,
        "a": 0,
        "selectedMuxChannel": "CH2",
        "c": 0
      },
      {
        "switchValue": 3,
        "b": 1,
        "cableNumber": 4,
        "a": 1,
        "selectedMuxChannel": "CH3",
        "c": 0
      },
      {
        "switchValue": 4,
        "b": 0,
        "cableNumber": 5,
        "a": 0,
        "selectedMuxChannel": "CH4",
        "c": 1
      },
      {
        "switchValue": 5,
        "b": 0,
        "cableNumber": 6,
        "a": 1,
        "selectedMuxChannel": "CH5",
        "c": 1
      },
      {
        "switchValue": 6,
        "b": 1,
        "cableNumber": 7,
        "a": 0,
        "selectedMuxChannel": "CH6",
        "c": 1
      },
      {
        "switchValue": 7,
        "b": 1,
        "cableNumber": 8,
        "a": 1,
        "selectedMuxChannel": "CH7",
        "c": 1
      }
    ]
  },
  "new_components": [],
  "excluded_FPGA_simulation_helpers": [
    "27C64",
    "74HCT244",
    "74HCT02"
  ],
  "withdrawn_previous_additions": [
    "SN74LVC245A",
    "100k pulldown x5",
    "100nF x1"
  ],
  "inventory_sources": [
    "课程实验材料清单与手动八路方案的整理记录；原始资料未随开源项目分发。",
    "本仓库保留的参考网络与器件模型，用于布线规划和教学。"
  ],
  "inventory_comparison": [
    [
      "1k电阻",
      "原清单1只",
      "本方案6只",
      "两只数码管3/8脚各一只，共4只；另有2只告警LED电阻，现有库存另核对。"
    ],
    [
      "10nF电容",
      "1只",
      "2只",
      "当前555定时和CV各1只；原单少1只"
    ],
    [
      "100nF电容",
      "未列出",
      "1只",
      "当前ADC去耦1只；不能算原单已提供"
    ],
    [
      "八组编码电阻",
      "未按现有阻值列出",
      "8组等效值",
      "4769～36021Ω为仿真值；实物阻值组合未落实"
    ],
    [
      "24uF电容",
      "1只",
      "0只",
      "当前15kHz方案不用"
    ],
    [
      "拨码开关",
      "8位×1",
      "8位×1，用3位",
      "没有额外三只SPDT"
    ]
  ],
  "physical_interface_status": "Board LOC and voltage interface unresolved. Wires denote logical signal correspondence, not approval for direct 5V-to-3.3V physical wiring.",
  "schemaVersion": 1,
  "title": "数字式电缆对线器 · 手动八路面包板接线参考",
  "currentDesign": "manual8-fpga-controlled-adc",
  "description": "保留当前手动八路仿真的器件与网络。芯片脚号为原厂PDIP顶视图；FPGA为40针开发板示意，接口编号不等同于封装P脚号。",
  "sources": [
    {
      "supports": "NE555 PDIP-8封装、脚号与无稳态振荡连接",
      "title": "TI NE555 data sheet",
      "id": "ti-ne555",
      "url": "https://www.ti.com/lit/ds/symlink/ne555.pdf"
    },
    {
      "supports": "CD4051B PDIP-16封装与通道/控制/电源脚号",
      "title": "TI CD4051B data sheet",
      "id": "ti-cd4051",
      "url": "https://www.ti.com/lit/ds/symlink/cd4051b.pdf"
    },
    {
      "supports": "ADC0804 PDIP-20封装、接口脚号及独立RC时钟",
      "title": "TI ADC0804-N data sheet",
      "id": "ti-adc0804",
      "url": "https://www.ti.com/lit/ds/symlink/adc0804-n.pdf"
    },
    {
      "supports": "CD4511BE PDIP-16封装、段输出脚号、共阴显示与5V下VIH≥3.5V",
      "title": "TI CD4511B data sheet",
      "id": "ti-cd4511",
      "url": "https://www.ti.com/lit/ds/symlink/cd4511b.pdf"
    },
    {
      "supports": "FPGA器件说明；不能替代开发板接口到实际封装引脚的映射表",
      "title": "AMD Spartan-3AN FPGA Family Data Sheet DS557",
      "id": "amd-ds557",
      "url": "https://docs.amd.com/v/u/en-US/ds557"
    },
    {
      "supports": "无晶振开发板采用555提供时钟，输出接开发板17、18或19接口",
      "title": "课程PPT第22页",
      "id": "course-slide22",
      "availability": "原始课程或实验工程资料不随本仓库分发；相关内容作为项目假设保留，实物接线须独立核对。"
    },
    {
      "supports": "20个逻辑I/O、555约15kHz、FPGA分频30000、ADC启动/读取与超时流程",
      "title": "当前手动基础版说明",
      "id": "manual-readme",
      "availability": "原始课程或实验工程资料不随本仓库分发；相关内容作为项目假设保留，实物接线须独立核对。"
    }
  ],
  "fpga": {
    "headerAssignments": {
      "17": "clk"
    },
    "clockHeader": 17,
    "otherHeaderAssignmentsConfirmed": false,
    "presentation": "40-pin development-board schematic",
    "clockConnection": {
      "to": "FPGA.17",
      "net": "clk",
      "from": "555.3",
      "status": "课程允许时钟接口17/18/19，网页预选17；电平接口待板卡确认"
    },
    "physicalPackageConfirmed": false,
    "type": "XC3S50AN",
    "note": "40针是开发板接口示意，并非XC3S50AN的DIP封装。17不是P17；其余逻辑信号暂不指定真实接口脚。",
    "clockHeaderAlternatives": [
      17,
      18,
      19
    ],
    "packagePadMapping": {},
    "pinCount": 40
  },
  "clock": {
    "rbOhm": 3900,
    "timerConnections": [
      "555.2与555.6相连至TIME",
      "RA 1.8k：+5V至DIS/555.7",
      "RB 3.9k：DIS/555.7至TIME",
      "CT 10nF：TIME至GND",
      "C_CV 10nF：555.5至GND",
      "555.4和555.8接+5V；555.1接GND"
    ],
    "nominalRefreshSeconds": 2,
    "frameDivider": 30000,
    "source": "NE555 pin 3 OUT",
    "adcClock": {
      "capacitorRef": "C_CLK",
      "note": "ADC19脚通过10k连ADC4脚，ADC4脚通过150pF接地。555不直接接ADC CLK_IN或/WR。",
      "independentOf555": true,
      "capacitorFarad": 1.5e-10,
      "resistorOhm": 10000,
      "resistorRef": "R_CLK"
    },
    "raOhm": 1800,
    "nominalFrequencyHz": 15000,
    "timingCapFarad": 1e-8,
    "destination": "XC3S50AN clk, schematic board header 17"
  },
  "constraints": [
    {
      "title": "FPGA接口电平待核对",
      "severity": "unresolved",
      "detail": "555与ADC使用5V。开发板接口保护/转换能力未知，逻辑网络不表示5V信号可直接接入3.3V FPGA。保留原有元件，不新增转换器。",
      "id": "fpga-voltage"
    },
    {
      "title": "CD4511BE输入门限",
      "severity": "unresolved",
      "detail": "实物选用CD4511BE。其5V供电时VIH最小3.5V，3.3V FPGA输出不满足保证门限；DISPLAY_VDD及板载接口方案待确认。",
      "minimumHighAt5V": 3.5,
      "id": "cd4511-voltage"
    },
    {
      "title": "排针编号与封装管脚不同",
      "severity": "unresolved",
      "detail": "仅把555时钟示意接到课程允许的开发板17接口；其余20路端口中的19路需按实际开发板接口表确认，不能把接口数字写成UCF的P数字。",
      "id": "board-pins"
    },
    {
      "title": "数码管物理脚号待确认",
      "severity": "unresolved",
      "detail": "用户已向老师确认数码管3、8脚为公共阴极，各串独立1kΩ接地。a–g段直接连接4511；其余段脚的实物编号尚待核对。",
      "id": "display-pins"
    },
    {
      "title": "选线拨码关断偏置待确认",
      "severity": "unresolved",
      "detail": "现有8位拨码用3位控制4051 A/B/C。单刀开关断开时必须有确定高低电平；当前网络未记录其偏置，不擅自增加电阻或改成SPDT。",
      "id": "switch-bias"
    },
    {
      "title": "实物电源轨分段需导通测试",
      "severity": "check",
      "detail": "主插孔每排同侧5孔相通，中沟两侧隔离；不根据照片臆断长电源轨整条连通。网页的分段设置应与万用表导通测试一致。",
      "id": "rail-continuity"
    },
    {
      "items": [
        [
          "1k电阻",
          "原清单1只",
          "本方案6只",
          "两只数码管3/8脚各一只，共4只；另有2只告警LED电阻，现有库存另核对。"
        ],
        [
          "10nF电容",
          "1只",
          "2只",
          "当前555定时和CV各1只；原单少1只"
        ],
        [
          "100nF电容",
          "未列出",
          "1只",
          "当前ADC去耦1只；不能算原单已提供"
        ],
        [
          "八组编码电阻",
          "未按现有阻值列出",
          "8组等效值",
          "4769～36021Ω为仿真值；实物阻值组合未落实"
        ],
        [
          "24uF电容",
          "1只",
          "0只",
          "当前15kHz方案不用"
        ],
        [
          "拨码开关",
          "8位×1",
          "8位×1，用3位",
          "没有额外三只SPDT"
        ]
      ],
      "title": "仿真阻容值与库存尚未完全闭合",
      "severity": "reference",
      "detail": "当前1kΩ共6只（数码管公共阴极4只、告警LED2只）；10nF两只、100nF一只与原单另核对，八个Rx仍为仿真等效值。",
      "id": "inventory"
    }
  ],
  "historicalDifferences": [
    "旧auto8自动扫描版本由FPGA驱动4051地址；本版是拨码开关直接选择4051，不自动扫描。",
    "proteus_manual_basic里的27C64、74HCT244、74HCT02仅是数字仿真替身，本网页整机不添加这些芯片。",
    "旧Proteus替身版ADC /CS与/RD接地、/WR接REFRESH；当前FPGA版由adc_cs_n/adc_rd_n/adc_wr_n控制并读取INTR。",
    "当前FPGA内部计30000个555时钟约2s刷新，不额外增加两秒时钟。",
    "旧网页显示模块的14只段电阻已移除；本版按老师确认，3、8脚各串一只1kΩ接地，两只数码管共四只。"
  ],
  "nets": [
    {
      "name": "+5V",
      "endpoints": [
        "555.4",
        "555.8",
        "MUX.16",
        "ADC.20",
        "R_PULL.1",
        "C_ADC.1",
        "RA.1"
      ]
    },
    {
      "name": "ADC_CLK",
      "endpoints": [
        "ADC.4",
        "R_CLK.2",
        "C_CLK.1"
      ]
    },
    {
      "name": "adc_code[0]",
      "endpoints": [
        "ADC.15",
        "FPGA.adc_code[0]"
      ]
    },
    {
      "name": "adc_code[1]",
      "endpoints": [
        "ADC.14",
        "FPGA.adc_code[1]"
      ]
    },
    {
      "name": "adc_code[2]",
      "endpoints": [
        "ADC.13",
        "FPGA.adc_code[2]"
      ]
    },
    {
      "name": "adc_code[3]",
      "endpoints": [
        "ADC.12",
        "FPGA.adc_code[3]"
      ]
    },
    {
      "name": "adc_code[4]",
      "endpoints": [
        "ADC.11",
        "FPGA.adc_code[4]"
      ]
    },
    {
      "name": "adc_cs_n",
      "endpoints": [
        "ADC.1",
        "FPGA.adc_cs_n"
      ]
    },
    {
      "name": "ADC_RCLK",
      "endpoints": [
        "ADC.19",
        "R_CLK.1"
      ]
    },
    {
      "name": "adc_rd_n",
      "endpoints": [
        "ADC.2",
        "FPGA.adc_rd_n"
      ]
    },
    {
      "name": "adc_wr_n",
      "endpoints": [
        "ADC.3",
        "FPGA.adc_wr_n"
      ]
    },
    {
      "name": "bcd_tens[0]",
      "endpoints": [
        "TENS.7",
        "FPGA.bcd_tens[0]"
      ]
    },
    {
      "name": "bcd_tens[1]",
      "endpoints": [
        "TENS.1",
        "FPGA.bcd_tens[1]"
      ]
    },
    {
      "name": "bcd_units[0]",
      "endpoints": [
        "UNITS.7",
        "FPGA.bcd_units[0]"
      ]
    },
    {
      "name": "bcd_units[1]",
      "endpoints": [
        "UNITS.1",
        "FPGA.bcd_units[1]"
      ]
    },
    {
      "name": "bcd_units[2]",
      "endpoints": [
        "UNITS.2",
        "FPGA.bcd_units[2]"
      ]
    },
    {
      "name": "bcd_units[3]",
      "endpoints": [
        "UNITS.6",
        "FPGA.bcd_units[3]"
      ]
    },
    {
      "name": "blank_n",
      "endpoints": [
        "UNITS.4",
        "TENS.4",
        "FPGA.blank_n"
      ]
    },
    {
      "name": "CH0",
      "endpoints": [
        "MUX.13",
        "RX1.1"
      ]
    },
    {
      "name": "CH1",
      "endpoints": [
        "MUX.14",
        "RX2.1"
      ]
    },
    {
      "name": "CH2",
      "endpoints": [
        "MUX.15",
        "RX3.1"
      ]
    },
    {
      "name": "CH3",
      "endpoints": [
        "MUX.12",
        "RX4.1"
      ]
    },
    {
      "name": "CH4",
      "endpoints": [
        "MUX.1",
        "RX5.1"
      ]
    },
    {
      "name": "CH5",
      "endpoints": [
        "MUX.5",
        "RX6.1"
      ]
    },
    {
      "name": "CH6",
      "endpoints": [
        "MUX.2",
        "RX7.1"
      ]
    },
    {
      "name": "CH7",
      "endpoints": [
        "MUX.4",
        "RX8.1"
      ]
    },
    {
      "name": "clk",
      "endpoints": [
        "555.3",
        "FPGA.clk"
      ]
    },
    {
      "name": "CV",
      "endpoints": [
        "555.5",
        "C_CV.1"
      ]
    },
    {
      "name": "DIS",
      "endpoints": [
        "555.7",
        "RA.2",
        "RB.1"
      ]
    },
    {
      "name": "DISPLAY_VDD",
      "endpoints": [
        "UNITS.3",
        "UNITS.16",
        "TENS.3",
        "TENS.16"
      ]
    },
    {
      "name": "GND",
      "endpoints": [
        "555.1",
        "MUX.6",
        "MUX.7",
        "MUX.8",
        "ADC.7",
        "ADC.8",
        "ADC.10",
        "UNITS.5",
        "UNITS.8",
        "TENS.2",
        "TENS.5",
        "TENS.6",
        "TENS.8",
        "RX1.2",
        "RX2.2",
        "RX3.2",
        "RX4.2",
        "RX5.2",
        "RX6.2",
        "RX7.2",
        "RX8.2",
        "C_CLK.2",
        "C_ADC.2",
        "CT.2",
        "C_CV.2",
        "LED_SHORT.K",
        "LED_OPEN.K",
        "RTC3.2",
        "RTC8.2",
        "RUC3.2",
        "RUC8.2"
      ]
    },
    {
      "name": "intr_n",
      "endpoints": [
        "ADC.5",
        "FPGA.intr_n"
      ]
    },
    {
      "name": "led_open",
      "endpoints": [
        "R_OPEN.1",
        "FPGA.led_open"
      ]
    },
    {
      "name": "LED_OPEN_A",
      "endpoints": [
        "R_OPEN.2",
        "LED_OPEN.A"
      ]
    },
    {
      "name": "led_short",
      "endpoints": [
        "R_SHORT.1",
        "FPGA.led_short"
      ]
    },
    {
      "name": "LED_SHORT_A",
      "endpoints": [
        "R_SHORT.2",
        "LED_SHORT.A"
      ]
    },
    {
      "name": "rst_n",
      "endpoints": [
        "FPGA.rst_n"
      ]
    },
    {
      "name": "SEL_A",
      "endpoints": [
        "MUX.11",
        "DIP.SEL_A"
      ]
    },
    {
      "name": "SEL_B",
      "endpoints": [
        "MUX.10",
        "DIP.SEL_B"
      ]
    },
    {
      "name": "SEL_C",
      "endpoints": [
        "MUX.9",
        "DIP.SEL_C"
      ]
    },
    {
      "name": "T_a",
      "endpoints": [
        "TENS.13",
        "DISPLAY_tens.a"
      ]
    },
    {
      "name": "T_b",
      "endpoints": [
        "TENS.12",
        "DISPLAY_tens.b"
      ]
    },
    {
      "name": "T_c",
      "endpoints": [
        "TENS.11",
        "DISPLAY_tens.c"
      ]
    },
    {
      "name": "T_COM3",
      "endpoints": [
        "RTC3.1",
        "DISPLAY_tens.3"
      ]
    },
    {
      "name": "T_COM8",
      "endpoints": [
        "RTC8.1",
        "DISPLAY_tens.8"
      ]
    },
    {
      "name": "T_d",
      "endpoints": [
        "TENS.10",
        "DISPLAY_tens.d"
      ]
    },
    {
      "name": "T_e",
      "endpoints": [
        "TENS.9",
        "DISPLAY_tens.e"
      ]
    },
    {
      "name": "T_f",
      "endpoints": [
        "TENS.15",
        "DISPLAY_tens.f"
      ]
    },
    {
      "name": "T_g",
      "endpoints": [
        "TENS.14",
        "DISPLAY_tens.g"
      ]
    },
    {
      "name": "TIME",
      "endpoints": [
        "555.2",
        "555.6",
        "RB.2",
        "CT.1"
      ]
    },
    {
      "name": "U_a",
      "endpoints": [
        "UNITS.13",
        "DISPLAY_units.a"
      ]
    },
    {
      "name": "U_b",
      "endpoints": [
        "UNITS.12",
        "DISPLAY_units.b"
      ]
    },
    {
      "name": "U_c",
      "endpoints": [
        "UNITS.11",
        "DISPLAY_units.c"
      ]
    },
    {
      "name": "U_COM3",
      "endpoints": [
        "RUC3.1",
        "DISPLAY_units.3"
      ]
    },
    {
      "name": "U_COM8",
      "endpoints": [
        "RUC8.1",
        "DISPLAY_units.8"
      ]
    },
    {
      "name": "U_d",
      "endpoints": [
        "UNITS.10",
        "DISPLAY_units.d"
      ]
    },
    {
      "name": "U_e",
      "endpoints": [
        "UNITS.9",
        "DISPLAY_units.e"
      ]
    },
    {
      "name": "U_f",
      "endpoints": [
        "UNITS.15",
        "DISPLAY_units.f"
      ]
    },
    {
      "name": "U_g",
      "endpoints": [
        "UNITS.14",
        "DISPLAY_units.g"
      ]
    },
    {
      "name": "VX",
      "endpoints": [
        "MUX.3",
        "ADC.6",
        "R_PULL.2"
      ]
    }
  ],
  "displayWiring": {
    "layoutRevision": 2,
    "confirmedBy": "User after teacher confirmation",
    "perSegmentSeriesResistors": false,
    "commonCathodePins": [
      3,
      8
    ],
    "resistorPerCommonPinOhm": 1000,
    "totalDisplayResistors": 4
  },
  "referenceBasis": "项目整理的手动八路逻辑网络；课程资料和内部工程文件未分发，电气连接以本文件为公开参考。"
};
