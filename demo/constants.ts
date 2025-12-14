import { DemoScenario } from './types';

// 请确保在 public/audio/ 目录下有一个名为 frustration-audio.wav 的文件
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'work-stress',
    title: '工作压力',
    description: '因截止日期而感到精疲力竭。',
    initialInput: "我觉得工作快把我淹没了。每次刚完成一个任务，又会冒出三个新任务。我真的好累。",
    icon: '💼'
  },
  {
    id: 'study-pressure',
    title: '学习困惑',
    description: '对复杂的概念感到困惑和沮丧。',
    initialInput: "浮力到底怎么理解？老师讲了好多遍，但我脑子里还是一团浆糊，感觉自己好笨啊，真的搞不懂。",
    icon: '📚'
  },
  {
    id: 'relationship-anxiety',
    title: '情感困扰',
    description: '对伴侣关系感到不确定。',
    initialInput: "我们昨天吵了一架，他今天一天都没回我消息。我很害怕他会离开我。",
    icon: '💔'
  },
  {
    id: 'audio-frustration',
    title: '语音倾诉',
    description: '因考试成绩不理想而沮丧。',
    demoAudioUrl: '/audio/frustration-audio.wav', // 指向 public 目录下的文件
    icon: '🎙️'
  }
];