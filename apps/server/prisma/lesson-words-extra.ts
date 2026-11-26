/**
 * 扩展课程词表（第 21~100 个），与 seed.ts 的 lessonWords 结构保持一致。
 * 100 词按主题分组，均为 Elementary 阶段必学基础词。
 * 图片用 emoji 占位，后续接 COS 时可批量替换 imageUrl。
 */
export interface LessonWord {
  word: string
  phonetic: string
  meaning: string
  partOfSpeech: string
  englishDefinition: string
  example: string
  exampleTranslation: string
  emoji: string
}

export const extraLessonWords: LessonWord[] = [
  // ── 动物 1 ──────────────────────────────────────────────

  { word: 'lion', phonetic: '/ˈlaɪ.ən/', meaning: '狮子', partOfSpeech: 'noun', englishDefinition: 'A large wild cat with a mane.', example: 'The lion is the king of animals.', exampleTranslation: '狮子是动物之王。', emoji: '🦁' },
  { word: 'tiger', phonetic: '/ˈtaɪ.ɡə/', meaning: '老虎', partOfSpeech: 'noun', englishDefinition: 'A large wild cat with orange and black stripes.', example: 'The tiger has beautiful stripes.', exampleTranslation: '老虎有漂亮的花纹。', emoji: '🐯' },
  { word: 'elephant', phonetic: '/ˈel.ɪ.fənt/', meaning: '大象', partOfSpeech: 'noun', englishDefinition: 'A very large animal with a long trunk.', example: 'The elephant is drinking water.', exampleTranslation: '大象正在喝水。', emoji: '🐘' },
  { word: 'monkey', phonetic: '/ˈmʌŋ.ki/', meaning: '猴子', partOfSpeech: 'noun', englishDefinition: 'A small animal that likes to climb trees.', example: 'The monkey is eating a banana.', exampleTranslation: '猴子正在吃香蕉。', emoji: '🐵' },
  { word: 'rabbit', phonetic: '/ˈræb.ɪt/', meaning: '兔子', partOfSpeech: 'noun', englishDefinition: 'A small animal with long ears.', example: 'The rabbit jumps very fast.', exampleTranslation: '兔子跳得很快。', emoji: '🐰' },
  { word: 'horse', phonetic: '/hɔːs/', meaning: '马', partOfSpeech: 'noun', englishDefinition: 'A large animal that people can ride.', example: 'He rides a horse on the farm.', exampleTranslation: '他在农场骑马。', emoji: '🐴' },
  { word: 'cow', phonetic: '/kaʊ/', meaning: '奶牛', partOfSpeech: 'noun', englishDefinition: 'A farm animal that gives milk.', example: 'The cow is eating grass.', exampleTranslation: '奶牛正在吃草。', emoji: '🐄' },
  { word: 'pig', phonetic: '/pɪɡ/', meaning: '猪', partOfSpeech: 'noun', englishDefinition: 'A pink farm animal that likes to eat.', example: 'The pig is sleeping in the mud.', exampleTranslation: '猪正在泥里睡觉。', emoji: '🐷' },
  { word: 'duck', phonetic: '/dʌk/', meaning: '鸭子', partOfSpeech: 'noun', englishDefinition: 'A bird that can swim in water.', example: 'The duck is swimming in the lake.', exampleTranslation: '鸭子正在湖里游泳。', emoji: '🦆' },
  { word: 'sheep', phonetic: '/ʃiːp/', meaning: '绵羊', partOfSpeech: 'noun', englishDefinition: 'A farm animal with white wool.', example: 'The sheep are eating grass.', exampleTranslation: '绵羊正在吃草。', emoji: '🐑' },
  { word: 'bear', phonetic: '/beə/', meaning: '熊', partOfSpeech: 'noun', englishDefinition: 'A large wild animal with thick fur.', example: 'The bear is looking for food.', exampleTranslation: '熊正在找食物。', emoji: '🐻' },
  { word: 'panda', phonetic: '/ˈpæn.də/', meaning: '熊猫', partOfSpeech: 'noun', englishDefinition: 'A black and white bear from China.', example: 'The panda loves bamboo.', exampleTranslation: '熊猫喜欢竹子。', emoji: '🐼' },
  // ── 食物 2 ──────────────────────────────────────────────

  { word: 'rice', phonetic: '/raɪs/', meaning: '米饭', partOfSpeech: 'noun', englishDefinition: 'A common food made from small white grains.', example: 'We eat rice for lunch.', exampleTranslation: '我们午餐吃米饭。', emoji: '🍚' },
  { word: 'noodle', phonetic: '/ˈnuː.dəl/', meaning: '面条', partOfSpeech: 'noun', englishDefinition: 'A long thin food made from flour.', example: 'I like noodles for dinner.', exampleTranslation: '我晚餐喜欢吃面条。', emoji: '🍜' },
  { word: 'cake', phonetic: '/keɪk/', meaning: '蛋糕', partOfSpeech: 'noun', englishDefinition: 'A sweet food baked for celebrations.', example: 'The birthday cake is delicious.', exampleTranslation: '生日蛋糕很好吃。', emoji: '🎂' },
  { word: 'cookie', phonetic: '/ˈkʊk.i/', meaning: '饼干', partOfSpeech: 'noun', englishDefinition: 'A small sweet baked food.', example: 'She eats a cookie after school.', exampleTranslation: '她放学后吃一块饼干。', emoji: '🍪' },
  { word: 'candy', phonetic: '/ˈkæn.di/', meaning: '糖果', partOfSpeech: 'noun', englishDefinition: 'A small sweet food that children like.', example: 'The child is eating candy.', exampleTranslation: '孩子正在吃糖果。', emoji: '🍬' },
  { word: 'juice', phonetic: '/dʒuːs/', meaning: '果汁', partOfSpeech: 'noun', englishDefinition: 'A drink made from fruit.', example: 'I drink a glass of orange juice.', exampleTranslation: '我喝一杯橙汁。', emoji: '🧃' },
  { word: 'coffee', phonetic: '/ˈkɒf.i/', meaning: '咖啡', partOfSpeech: 'noun', englishDefinition: 'A dark drink made from roasted beans.', example: 'My mother drinks coffee every morning.', exampleTranslation: '我妈妈每天早上喝咖啡。', emoji: '☕' },
  { word: 'tea', phonetic: '/tiː/', meaning: '茶', partOfSpeech: 'noun', englishDefinition: 'A drink made from tea leaves and hot water.', example: 'Would you like a cup of tea?', exampleTranslation: '你想喝杯茶吗？', emoji: '🍵' },
  { word: 'soup', phonetic: '/suːp/', meaning: '汤', partOfSpeech: 'noun', englishDefinition: 'A hot liquid food made from vegetables or meat.', example: 'The soup is very hot.', exampleTranslation: '汤很烫。', emoji: '🍲' },
  { word: 'salad', phonetic: '/ˈsæl.əd/', meaning: '沙拉', partOfSpeech: 'noun', englishDefinition: 'A cold dish made from mixed vegetables.', example: 'She is making a vegetable salad.', exampleTranslation: '她正在做蔬菜沙拉。', emoji: '🥗' },
  { word: 'meat', phonetic: '/miːt/', meaning: '肉', partOfSpeech: 'noun', englishDefinition: 'The flesh of an animal used as food.', example: 'This meat is very fresh.', exampleTranslation: '这肉很新鲜。', emoji: '🥩' },
  { word: 'chicken', phonetic: '/ˈtʃɪk.ɪn/', meaning: '鸡肉', partOfSpeech: 'noun', englishDefinition: 'The meat of a chicken used as food.', example: 'We have chicken for dinner.', exampleTranslation: '我们晚餐吃鸡肉。', emoji: '🍗' },
  // ── 家庭与人物 3 ────────────────────────────────────────

  { word: 'mother', phonetic: '/ˈmʌð.ə/', meaning: '妈妈', partOfSpeech: 'noun', englishDefinition: 'A female parent.', example: 'My mother is a teacher.', exampleTranslation: '我妈妈是老师。', emoji: '👩' },
  { word: 'father', phonetic: '/ˈfɑː.ðə/', meaning: '爸爸', partOfSpeech: 'noun', englishDefinition: 'A male parent.', example: 'My father is very strong.', exampleTranslation: '我爸爸很强壮。', emoji: '👨' },
  { word: 'sister', phonetic: '/ˈsɪs.tə/', meaning: '姐妹', partOfSpeech: 'noun', englishDefinition: 'A female brother or sister in a family.', example: 'I have one sister.', exampleTranslation: '我有一个姐姐。', emoji: '👧' },
  { word: 'brother', phonetic: '/ˈbrʌð.ə/', meaning: '兄弟', partOfSpeech: 'noun', englishDefinition: 'A male sibling in a family.', example: 'My brother is six years old.', exampleTranslation: '我弟弟六岁。', emoji: '👦' },
  { word: 'grandma', phonetic: '/ˈɡræn.mɑː/', meaning: '奶奶', partOfSpeech: 'noun', englishDefinition: 'The mother of one of your parents.', example: 'Grandma is making cookies.', exampleTranslation: '奶奶正在做饼干。', emoji: '👵' },
  { word: 'grandpa', phonetic: '/ˈɡræn.pɑː/', meaning: '爷爷', partOfSpeech: 'noun', englishDefinition: 'The father of one of your parents.', example: 'Grandpa is reading a book.', exampleTranslation: '爷爷正在看书。', emoji: '👴' },
  { word: 'baby', phonetic: '/ˈbeɪ.bi/', meaning: '婴儿', partOfSpeech: 'noun', englishDefinition: 'A very young child.', example: 'The baby is sleeping.', exampleTranslation: '婴儿正在睡觉。', emoji: '👶' },
  { word: 'friend', phonetic: '/frend/', meaning: '朋友', partOfSpeech: 'noun', englishDefinition: 'A person you like and know well.', example: 'She is my best friend.', exampleTranslation: '她是我最好的朋友。', emoji: '👫' },
  { word: 'teacher', phonetic: '/ˈtiː.tʃə/', meaning: '老师', partOfSpeech: 'noun', englishDefinition: 'A person whose job is to teach.', example: 'Our teacher is very kind.', exampleTranslation: '我们的老师很和蔼。', emoji: '👩‍🏫' },
  { word: 'student', phonetic: '/ˈstjuː.dənt/', meaning: '学生', partOfSpeech: 'noun', englishDefinition: 'A person who studies at a school.', example: 'He is a good student.', exampleTranslation: '他是个好学生。', emoji: '🧑‍🎓' },
  // ── 日常物品 4 ──────────────────────────────────────────

  { word: 'table', phonetic: '/ˈteɪ.bəl/', meaning: '桌子', partOfSpeech: 'noun', englishDefinition: 'A piece of furniture with a flat top and legs.', example: 'The book is on the table.', exampleTranslation: '书在桌子上。', emoji: '🪑' },
  { word: 'bed', phonetic: '/bed/', meaning: '床', partOfSpeech: 'noun', englishDefinition: 'A piece of furniture that you sleep on.', example: 'The cat is on the bed.', exampleTranslation: '猫在床上。', emoji: '🛏️' },
  { word: 'door', phonetic: '/dɔː/', meaning: '门', partOfSpeech: 'noun', englishDefinition: 'An opening that you can close to enter a room.', example: 'Please close the door.', exampleTranslation: '请关门。', emoji: '🚪' },
  { word: 'window', phonetic: '/ˈwɪn.dəʊ/', meaning: '窗户', partOfSpeech: 'noun', englishDefinition: 'An opening in a wall that lets in light and air.', example: 'The window is open.', exampleTranslation: '窗户开着。', emoji: '🪟' },
  { word: 'clock', phonetic: '/klɒk/', meaning: '时钟', partOfSpeech: 'noun', englishDefinition: 'A device that shows the time.', example: 'The clock is on the wall.', exampleTranslation: '钟在墙上。', emoji: '🕐' },
  { word: 'lamp', phonetic: '/læmp/', meaning: '台灯', partOfSpeech: 'noun', englishDefinition: 'A device that gives light when you turn it on.', example: 'Turn on the lamp, please.', exampleTranslation: '请打开台灯。', emoji: '💡' },
  { word: 'phone', phonetic: '/fəʊn/', meaning: '电话', partOfSpeech: 'noun', englishDefinition: 'A device used to call people and send messages.', example: 'My phone is new.', exampleTranslation: '我的手机是新的。', emoji: '📱' },
  { word: 'computer', phonetic: '/kəmˈpjuː.tə/', meaning: '电脑', partOfSpeech: 'noun', englishDefinition: 'A machine that can store and process information.', example: 'I study on the computer.', exampleTranslation: '我用电脑学习。', emoji: '💻' },
  { word: 'key', phonetic: '/kiː/', meaning: '钥匙', partOfSpeech: 'noun', englishDefinition: 'A small metal object used to open a lock.', example: 'I found my key.', exampleTranslation: '我找到了钥匙。', emoji: '🔑' },
  { word: 'cup', phonetic: '/kʌp/', meaning: '杯子', partOfSpeech: 'noun', englishDefinition: 'A small container used for drinking.', example: 'This cup is very nice.', exampleTranslation: '这个杯子很好看。', emoji: '🥤' },
  // ── 自然与地点 5 ────────────────────────────────────────

  { word: 'sky', phonetic: '/skaɪ/', meaning: '天空', partOfSpeech: 'noun', englishDefinition: 'The space above the earth where you see clouds and stars.', example: 'The sky is blue today.', exampleTranslation: '今天天空很蓝。', emoji: '🌤️' },
  { word: 'cloud', phonetic: '/klaʊd/', meaning: '云', partOfSpeech: 'noun', englishDefinition: 'A soft white or grey mass in the sky.', example: 'There is a white cloud.', exampleTranslation: '有一朵白云。', emoji: '☁️' },
  { word: 'rain', phonetic: '/reɪn/', meaning: '雨', partOfSpeech: 'noun', englishDefinition: 'Water that falls from the clouds in drops.', example: 'The rain is very heavy.', exampleTranslation: '雨下得很大。', emoji: '🌧️' },
  { word: 'snow', phonetic: '/snəʊ/', meaning: '雪', partOfSpeech: 'noun', englishDefinition: 'Soft white pieces of frozen water that fall in cold weather.', example: 'The snow is very beautiful.', exampleTranslation: '雪很漂亮。', emoji: '❄️' },
  { word: 'wind', phonetic: '/wɪnd/', meaning: '风', partOfSpeech: 'noun', englishDefinition: 'Moving air that you can feel.', example: 'The wind is strong today.', exampleTranslation: '今天风很大。', emoji: '💨' },
  { word: 'mountain', phonetic: '/ˈmaʊn.tɪn/', meaning: '山', partOfSpeech: 'noun', englishDefinition: 'A large area of land that rises high above the ground.', example: 'The mountain is very high.', exampleTranslation: '这座山很高。', emoji: '⛰️' },
  { word: 'river', phonetic: '/ˈrɪv.ə/', meaning: '河流', partOfSpeech: 'noun', englishDefinition: 'A long narrow area of water that flows to the sea.', example: 'The river is very long.', exampleTranslation: '这条河很长。', emoji: '🏞️' },
  { word: 'lake', phonetic: '/leɪk/', meaning: '湖', partOfSpeech: 'noun', englishDefinition: 'A large area of water surrounded by land.', example: 'We swim in the lake.', exampleTranslation: '我们在湖里游泳。', emoji: '🏞️' },
  { word: 'sea', phonetic: '/siː/', meaning: '大海', partOfSpeech: 'noun', englishDefinition: 'A very large area of salt water.', example: 'The sea is blue and wide.', exampleTranslation: '大海又蓝又宽。', emoji: '🌊' },
  { word: 'beach', phonetic: '/biːtʃ/', meaning: '沙滩', partOfSpeech: 'noun', englishDefinition: 'The sandy area next to the sea.', example: 'The children are playing on the beach.', exampleTranslation: '孩子们在沙滩上玩。', emoji: '🏖️' },
  // ── 身体与动作 6 ────────────────────────────────────────

  { word: 'head', phonetic: '/hed/', meaning: '头', partOfSpeech: 'noun', englishDefinition: 'The top part of your body that contains your brain.', example: 'My head is fine.', exampleTranslation: '我的头没事。', emoji: '🗣️' },
  { word: 'eye', phonetic: '/aɪ/', meaning: '眼睛', partOfSpeech: 'noun', englishDefinition: 'The part of your body that you use to see.', example: 'Her eyes are very big.', exampleTranslation: '她的眼睛很大。', emoji: '👁️' },
  { word: 'ear', phonetic: '/ɪə/', meaning: '耳朵', partOfSpeech: 'noun', englishDefinition: 'The part of your body that you use to hear.', example: 'The mouse has big ears.', exampleTranslation: '老鼠有大耳朵。', emoji: '👂' },
  { word: 'nose', phonetic: '/nəʊz/', meaning: '鼻子', partOfSpeech: 'noun', englishDefinition: 'The part of your face that you use to smell.', example: 'The dog has a long nose.', exampleTranslation: '狗有长鼻子。', emoji: '👃' },
  { word: 'mouth', phonetic: '/maʊθ/', meaning: '嘴', partOfSpeech: 'noun', englishDefinition: 'The part of your face that you use to eat and speak.', example: 'Open your mouth, please.', exampleTranslation: '请张开嘴。', emoji: '👄' },
  { word: 'hand', phonetic: '/hænd/', meaning: '手', partOfSpeech: 'noun', englishDefinition: 'The part of your body at the end of your arm.', example: 'Wash your hands before eating.', exampleTranslation: '饭前洗手。', emoji: '✋' },
  { word: 'foot', phonetic: '/fʊt/', meaning: '脚', partOfSpeech: 'noun', englishDefinition: 'The part of your body at the end of your leg.', example: 'My foot hurts.', exampleTranslation: '我的脚疼。', emoji: '🦶' },
  { word: 'hair', phonetic: '/heə/', meaning: '头发', partOfSpeech: 'noun', englishDefinition: 'The thin threads that grow on your head.', example: 'She has long hair.', exampleTranslation: '她有长头发。', emoji: '💇' },
  { word: 'heart', phonetic: '/hɑːt/', meaning: '心', partOfSpeech: 'noun', englishDefinition: 'The organ in your chest that pumps blood.', example: 'My heart is beating fast.', exampleTranslation: '我的心跳得很快。', emoji: '❤️' },
  { word: 'run', phonetic: '/rʌn/', meaning: '跑', partOfSpeech: 'verb', englishDefinition: 'To move quickly on foot.', example: 'The children run in the park.', exampleTranslation: '孩子们在公园里跑。', emoji: '🏃' },
  // ── 形容词与颜色 7 ──────────────────────────────────────

  { word: 'red', phonetic: '/red/', meaning: '红色', partOfSpeech: 'adjective', englishDefinition: 'The colour of blood or a ripe tomato.', example: 'The apple is red.', exampleTranslation: '苹果是红色的。', emoji: '🔴' },
  { word: 'blue', phonetic: '/bluː/', meaning: '蓝色', partOfSpeech: 'adjective', englishDefinition: 'The colour of the clear sky.', example: 'The sky is blue.', exampleTranslation: '天空是蓝色的。', emoji: '🔵' },
  { word: 'green', phonetic: '/ɡriːn/', meaning: '绿色', partOfSpeech: 'adjective', englishDefinition: 'The colour of grass and leaves.', example: 'The grass is green.', exampleTranslation: '草是绿色的。', emoji: '🟢' },
  { word: 'yellow', phonetic: '/ˈjel.əʊ/', meaning: '黄色', partOfSpeech: 'adjective', englishDefinition: 'The colour of the sun or a banana.', example: 'The banana is yellow.', exampleTranslation: '香蕉是黄色的。', emoji: '🟡' },
  { word: 'black', phonetic: '/blæk/', meaning: '黑色', partOfSpeech: 'adjective', englishDefinition: 'The darkest colour.', example: 'The cat is black.', exampleTranslation: '猫是黑色的。', emoji: '⚫' },
  { word: 'white', phonetic: '/waɪt/', meaning: '白色', partOfSpeech: 'adjective', englishDefinition: 'The colour of snow or milk.', example: 'The snow is white.', exampleTranslation: '雪是白色的。', emoji: '⚪' },
  { word: 'pink', phonetic: '/pɪŋk/', meaning: '粉色', partOfSpeech: 'adjective', englishDefinition: 'A light red colour.', example: 'She has a pink bag.', exampleTranslation: '她有一个粉色的包。', emoji: '🌸' },
  { word: 'happy', phonetic: '/ˈhæp.i/', meaning: '开心', partOfSpeech: 'adjective', englishDefinition: 'Feeling good and pleased.', example: 'I am very happy today.', exampleTranslation: '我今天很开心。', emoji: '😊' },
  // ── 时间与天数 8 ────────────────────────────────────────

  { word: 'morning', phonetic: '/ˈmɔː.nɪŋ/', meaning: '早上', partOfSpeech: 'noun', englishDefinition: 'The early part of the day.', example: 'Good morning!', exampleTranslation: '早上好！', emoji: '🌅' },
  { word: 'afternoon', phonetic: '/ˌɑːf.təˈnuːn/', meaning: '下午', partOfSpeech: 'noun', englishDefinition: 'The time between noon and evening.', example: 'Good afternoon!', exampleTranslation: '下午好！', emoji: '🌞' },
  { word: 'evening', phonetic: '/ˈiː.vən.ɪŋ/', meaning: '晚上', partOfSpeech: 'noun', englishDefinition: 'The later part of the day when it gets dark.', example: 'Good evening!', exampleTranslation: '晚上好！', emoji: '🌆' },
  { word: 'night', phonetic: '/naɪt/', meaning: '夜晚', partOfSpeech: 'noun', englishDefinition: 'The time when it is dark and most people sleep.', example: 'The stars are out at night.', exampleTranslation: '夜晚星星出来了。', emoji: '🌙' },
  { word: 'today', phonetic: '/təˈdeɪ/', meaning: '今天', partOfSpeech: 'noun', englishDefinition: 'The day that is happening now.', example: 'Today is Monday.', exampleTranslation: '今天是星期一。', emoji: '📅' },
  { word: 'tomorrow', phonetic: '/təˈmɒr.əʊ/', meaning: '明天', partOfSpeech: 'noun', englishDefinition: 'The day after today.', example: 'See you tomorrow!', exampleTranslation: '明天见！', emoji: '📆' },
  { word: 'yesterday', phonetic: '/ˈjes.tə.deɪ/', meaning: '昨天', partOfSpeech: 'noun', englishDefinition: 'The day before today.', example: 'It rained yesterday.', exampleTranslation: '昨天下雨了。', emoji: '🗓️' },
  { word: 'week', phonetic: '/wiːk/', meaning: '星期', partOfSpeech: 'noun', englishDefinition: 'A period of seven days.', example: 'There are seven days in a week.', exampleTranslation: '一周有七天。', emoji: '🗓️' },
]
