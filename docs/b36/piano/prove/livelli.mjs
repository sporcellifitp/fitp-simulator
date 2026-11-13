import * as NS from './src/natpf/natpf_skill.js';
import * as NO from './src/natpf/natpf_stroke_outcome.js';
for (const k of ['bambini','casual','evento','pro','1v1','leggenda']){
  const lv = NS.skillLevel(k);
  const as = NO.assistOf(lv);
  const which = Object.entries(NO.ASSIST).find(([n,v])=>v===as)?.[0];
  console.log(k, 'name=', lv?.name, 'timingSpan=', lv?.timingSpan, 'assistWindow=', lv?.assistWindow, 'cpuLegend=', !!lv?.cpuLegend, '-> ASSIST', which, 'dirSpan=', NO.directionSpan(lv), 'lateMargin=', lv?.lateMargin);
}
