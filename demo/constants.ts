import { DemoScenario } from './types';

// 请确保在 public/audio/ 目录下有一个名为 frustration-audio.wav 的文件
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'text-only',
    title: '文本模态',
    description: '纯文字表达情绪和想法',
    initialInput: "我觉得工作快把我淹没了。每次刚完成一个任务，又会冒出三个新任务。我真的好累。",
    icon: '📝'
  },
  {
    id: 'audio-only',
    title: '音频模态',
    description: '通过语音传达真实感受',
    demoAudioUrl: '/audio/frustration-audio.wav',
    icon: '🎙️'
  },
  {
    id: 'multimodal',
    title: '混合模态',
    description: '文本与语音结合表达',
    initialInput: "浮力到底怎么理解？老师讲了好多遍，但我脑子里还是一团浆糊。",
    demoAudioUrl: '/audio/frustration-audio.wav',
    icon: '🔀'
  }
];