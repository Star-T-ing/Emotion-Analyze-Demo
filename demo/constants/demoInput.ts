import { DemoScenario } from '../types';

// 请确保在 public/audio/ 目录下有对应的音频文件
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'text-only-1',
    title: '文本模态',
    description: '纯文字表达情绪和想法',
    initialInput: "数学作业又没做完😰，明天老师肯定要批评我了。我不是不想做，就是看到那些题目脑子就一片空白🤯，越着急越做不出来。同学们都觉得很简单，就我一个人不会😔，我是不是太笨了？",
    icon: '📝',
    exampleTitle: '学习压力'
  },
  {
    id: 'text-only-2',
    title: '文本模态',
    description: '纯文字表达情绪和想法',
    initialInput: "今天在学校又被同学孤立了😞。午饭时间大家都有说有笑，就我一个人坐在角落🥺。我试着加入他们的话题，但他们好像都不太想理我。我也不知道自己做错了什么，感觉特别孤单💔。",
    icon: '📝',
    exampleTitle: '人际关系'
  },
  {
    id: 'audio-only-1',
    title: '音频模态',
    description: '通过语音传达真实感受',
    demoAudioUrl: '/audio/audio-only-1.wav',
    icon: '🎙️',
    exampleTitle: '考试焦虑'
  },
  {
    id: 'audio-only-2',
    title: '音频模态',
    description: '通过语音传达真实感受',
    demoAudioUrl: '/audio/audio-only-2.wav',
    icon: '🎙️',
    exampleTitle: '家庭压力'
  },
  {
    id: 'multimodal-1',
    title: '混合模态',
    description: '文本与语音结合表达',
    initialInput: "物理的浮力概念我怎么都理解不了😵。老师上课讲的时候感觉听懂了✅，但一做题就全忘了🤦。眼看就要期中考试了，我真的很担心😟。",
    demoAudioUrl: '/audio/multimodal-1.wav',
    icon: '🔀',
    exampleTitle: '学习困难'
  },
  {
    id: 'multimodal-2',
    title: '混合模态',
    description: '文本与语音结合表达',
    initialInput: "爸妈总是拿我和别人家的孩子比较😤，说我成绩不够好，不够努力。可是我已经很努力了💪，每天学到很晚，但成绩还是上不去。我觉得自己永远达不到他们的期望😢。",
    demoAudioUrl: '/audio/multimodal-2.wav',
    icon: '🔀',
    exampleTitle: '期望压力'
  }
];