// ECharts 按需注册，集中在模块顶层执行一次
import { use, init } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, TitleComponent, LabelLayout]);

export { init };
