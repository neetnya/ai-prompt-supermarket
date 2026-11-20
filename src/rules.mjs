/* ============ 常用分类（人工精选 + 全量库自动归类）============ */
export const CURATED = {
  "质量词": ["masterpiece","best quality","newest","safe","amazing quality","absurdres","highres","very detailed","detailed face","detailed background"],
  "年代/日期": ["old","early","mid","recent","newest"],
  "角色数量": ["1girl","1boy","2girls","solo","multiple people","2boys","3girls","1other","crowd"],
  "发色": ["black hair","white hair","blonde hair","brown hair","red hair","blue hair","pink hair","purple hair","green hair","silver hair","orange hair","grey hair","multicolored hair"],
  "发型": ["long hair","medium hair","short hair","ponytail","twintails","braid","twin braids","ahoge","bangs","wavy hair","straight hair","bun","side ponytail","low twintails","bob cut","sidelocks","curly hair","very long hair","messy hair","drill hair","hair down"],
  "眼睛 / 瞳色": ["red eyes","blue eyes","green eyes","black eyes","yellow eyes","purple eyes","pink eyes","grey eyes","heterochromia","large eyes","half-closed eyes","teary eyes","glowing eyes","dilated pupils","slit pupils","sparkling eyes","eyelashes","eye contact"],
  "表情": ["smile","grin","smirk","wink","tongue out","blush","embarrassed","innocent","confused","sad","crying","tears","happy","surprised","nervous","seductive","ahegao","expressionless","open mouth","panting","frown","closed eyes","side glance","moaning","lewd","slutty","flustered","denial","yandere","shy","tsundere","angry","laughing","pout"],
  "身材": ["large breasts","huge breasts","gigantic breasts","small breasts","flat chest","slim","slender","voluptuous","narrow waist","thick thighs","pale skin","tan","dark skin","long legs","big ass","collarbone","hourglass figure","petite","curvy","muscular","medium breasts","wide hips","chubby","plump"],
  "服装": ["school uniform","sailor uniform","swimsuit","bikini","maid","kimono","one-piece","skirt","stockings","thighhighs","pantyhose","off-shoulder","white shirt","t-shirt","suit","track suit","underwear","lace underwear","garter","nude","fully nude","topless","revealing clothes","short shorts","see-through","cleavage","hoodie","sweater","jacket","coat","dress","yukata","sarong","crossdressing","detached sleeves","gloves","heels","boots","school swimsuit","bunny suit","cheerleader","crop top","tank top","blazer","pleated skirt"],
  "姿势 / 动作": ["standing","sitting","lying","kneeling","squatting","sitting on bed","lying on bed","prone","straddling","looking back","looking at viewer","looking away","raising hand","hands on hips","peace sign","selfie","heart hands","stretching","spread legs","leg up","hands behind back","hand over mouth","playing with hair","all fours","on all fours","arms up","crossed arms","reclining","spread arms","hand on chin","thumbs up","fingers crossed","arms behind head"],
  "场景 / 背景": ["bedroom","bathroom","shower","bathtub","outdoors","beach","swimming pool","indoors","classroom","kitchen","couch","on bed","by window","night","sunset","day","sky","cherry blossoms","forest","city","street","grass","underwater","hot spring","onsen","balcony","rooftop","alley","library","office","park","snow","rain","mountain"],
  "画风 / 质感": ["anime style","manhwa","webtoon","cel shading","semi-realistic","lineart","watercolor","cinematic","3d render","photorealistic","concept art","illustration","hand-drawn","dramatic lighting","soft lighting","depth of field","sketch","oil painting","pixel art","chibi","monochrome","high contrast","gradient background","anime coloring","thick outlines"],
  "来源 / 画质": ["game cg","concept art","production art","promotional art","key visual","novel illustration","official wallpaper","artbook","magazine scan","anime screenshot","highres","absurdres","textless version","variant set","large variant set"],
  "媒材 / 手绘": ["traditional media","watercolor (medium)","oil painting (medium)","marker (medium)","colored pencil (medium)","graphite (medium)","ink (medium)","photo (medium)","pixel art"],
  "NSFW 专属": ["masturbation","penetration","cowgirl position","doggy style","fellatio","squirting","lactating","kissing","caressing","breast fondling","breast squeeze","exposed pussy","creampie","cum","licking","grinding","panties","lingerie","dildo","vibrator","sex toy","bondage","shibari","handjob","footjob","oral","anal","vaginal","orgasm","ejaculation","multiple orgasm","genital slit","spread pussy","clitoris","penis","testicles","nipples","areola","milk","breast milk"],
  "负面词": ["lowres","low quality","worst quality","bad anatomy","bad hands","bad fingers","missing fingers","extra fingers","extra limbs","extra digits","deformed","distorted","blurry","jpeg artifacts","watermark","signature","username","text","mutation","poorly drawn face","poorly drawn hands","poorly drawn body","ugly","morbid","multiple breasts","amputee","malformed limbs","gross proportions","long neck","duplicate","monochrome","greyscale","censored","noise","grainy","logo"]
};

/* ============ 自动归类规则（en 关键词 → 分类名）============ */
export const AUTO = {
  "发色": [["black hair"],["white hair"],["blonde hair"],["brown hair"],["red hair"],["blue hair"],["pink hair"],["purple hair"],["green hair"],["silver hair"],["grey hair"],["orange hair"],["rainbow hair"],["multicolored hair"]],
  "发型": [["ponytail"],["twintails"],["braid"],["ahoge"],["bangs"],["bun"],["sidelocks"],["bob cut"],["straight hair"],["wavy hair"],["curly hair"],["hair down"],["hair over"],["hair between"],["hair clip"],["hair tie"],["drill hair"],["hair flaps"],["low twintails"],["side ponytail"]],
  "眼睛 / 瞳色": [["red eyes"],["blue eyes"],["green eyes"],["yellow eyes"],["purple eyes"],["pink eyes"],["grey eyes"],["black eyes"],["brown eyes"],["heterochromia"],["eye contact"],["eyelashes"],["eyeliner"],["closed eyes"],["half-closed eyes"],["dilated pupils"],["glowing eyes"]],
  "表情": [["smile"],["blush"],["expression"],["frown"],["tear"],["pout"],["smirk"],["wink"],["crying"],["laugh"],["angry"],["surprised"],["sad"],["happy"],["nervous"],["embarrassed"],["panting"],["moaning"],["seductive"],["ahegao"],["tongue out"],["grin"],["flustered"],["horny"],["lewd"],["cheerful"]],
  "身材": [["breast"],["chest"],["waist"],["thigh"],["hips"],["skin"],["muscular"],["slim"],["slender"],["petite"],["curvy"],["hourglass"],["voluptuous"],["chubby"],["plump"],["toned"],["figure"]],
  "服装": [["uniform"],["dress"],["shirt"],["skirt"],["underwear"],["bikini"],["swimsuit"],["kimono"],["coat"],["jacket"],["hoodie"],["sweater"],["maid"],["stockings"],["thighhighs"],["pantyhose"],["garter"],["lingerie"],["shoe"],["boot"],["glove"],["sock"],["scarf"],["hat"],["ribbon"],["bow"],["pants"],["shorts"],["jeans"],["blouse"],["vest"],["tie"],["belt"],["nude"],["naked"],["topless"],["bra"],["sailor"],["costume"],["armor"],["cape"],["robe"],["gown"],["apron"],["leggings"],["corset"],["bodysuit"]],
  "姿势 / 动作": [["standing"],["sitting"],["lying"],["kneeling"],["squatting"],["running"],["walking"],["jumping"],["dancing"],["straddling"],["leaning"],["reclining"],["bending"],["prone"],["all fours"],["spread legs"],["raising hand"],["pointing"],["crossed arms"],["holding"],["touching"],["carrying"],["lifting"],["looking"],["arms up"],["hands on"],["legs up"],["pose"]],
  "场景 / 背景": [["bedroom"],["bathroom"],["shower"],["bathtub"],["beach"],["pool"],["outdoors"],["indoors"],["classroom"],["kitchen"],["couch"],["window"],["night"],["sunset"],["sky"],["forest"],["city"],["street"],["grass"],["underwater"],["onsen"],["balcony"],["rooftop"],["room"],["building"],["ocean"],["sea"],["garden"],["park"],["snow"],["rain"],["mountain"],["alley"],["field"]],
  "画风 / 质感": [["anime style"],["manhwa"],["webtoon"],["lineart"],["cel shading"],["watercolor"],["sketch"],["cinematic"],["3d"],["photorealistic"],["concept art"],["illustration"],["painting"],["render"],["chibi"],["monochrome"],["greyscale"],["depth of field"],["lighting"],["oil painting"]],
  "NSFW 专属": [["sex"],["penetration"],["masturbation"],["nude"],["naked"],["pussy"],["penis"],["cum"],["squirt"],["fellatio"],["oral"],["cowgirl"],["doggy"],["missionary"],["anal"],["blowjob"],["creampie"],["lactating"],["milk"],["bondage"],["shibari"],["vibrator"],["dildo"],["sex toy"],["orgasm"],["ejaculation"],["clitoris"],["nipple"],["testicle"],["handjob"],["footjob"],["kissing"],["fondling"],["caressing"],["genital"],["threesome"],["spitroast"],["piledriver"],["impregnation"],["pregnancy"]]
};

const escRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* 词边界匹配预编译：把关键词转成 \b(?:kw1|kw2)\b，避免 winchester→chest 这类子串误抓 */
export const AUTO_RE = {};
Object.keys(AUTO).forEach(c => {
  const flat = [].concat(...AUTO[c]);
  AUTO_RE[c] = new RegExp('\\b(?:' + flat.map(escRegex).join('|') + ')\\b');
});

/* 分类排除：身材里剔除动作/接触/标记类，防止 "hand_on_chest" / "hand on chest" 混进身材 */
export const AUTO_EXCLUDE = {
  '身材': /(hand|arm|finger|foot|grab|hold|cover|pull|lift|push|spread|cross|stand|sit|lie|kneel|lean|raise|touch|carry|between|against|under|over|into|across|around|behind|beside|on[_ ])/i
};

export const NEG_WORDS = new Set([
  "lowres","low quality","worst quality","bad anatomy","bad hands","bad fingers","missing fingers",
  "extra fingers","extra limbs","extra digits","deformed","distorted","blurry","jpeg artifacts",
  "watermark","signature","username","text","mutation","poorly drawn face","poorly drawn hands",
  "poorly drawn body","ugly","morbid","multiple breasts","amputee","malformed limbs",
  "gross proportions","long neck","duplicate","monochrome","greyscale"
]);

/* 人工翻译补丁：精选词里数据库没有的，优先用这里 */
export const CURATED_ZH = {
  'masterpiece':'杰作','best quality':'最佳质量','amazing quality':'惊人质量','very detailed':'细节丰富',
  'multiple people':'多人','silver hair':'银发','bangs':'刘海','bun':'发髻','large eyes':'大眼睛','teary eyes':'泪眼',
  'wink':'眨眼','innocent':'无辜','seductive':'勾引','panting':'喘气','side glance':'斜视','lewd':'淫荡','slutty':'淫乱','flustered':'慌乱','denial':'否认','yandere':'病娇',
  'slim':'苗条','slender':'纤细','voluptuous':'丰满','big ass':'翘臀','hourglass figure':'沙漏身材','dollchestra':'Dollchestra(企划)',
  'sailor uniform':'水手服','one-piece':'连衣裙','stockings':'丝袜','off-shoulder':'露肩','lace underwear':'蕾丝内衣','garter':'吊带袜','fully nude':'全裸','topless':'露胸','see-through':'透视装','heels':'高跟鞋',
  'sitting on bed':'坐床上','lying on bed':'躺床上','prone':'俯卧','raising hand':'举手','hands on hips':'叉腰','peace sign':'剪刀手','hands behind back':'背手','hand over mouth':'捂嘴','on all fours':'四肢着地',
  'swimming pool':'游泳池','by window':'窗边','hot spring':'温泉',
  'anime style':'动漫风','manhwa':'韩漫风','cel shading':'赛璐璐','semi-realistic':'半写实','watercolor':'水彩','cinematic':'电影感','3d render':'3D渲染','illustration':'插画','hand-drawn':'手绘','dramatic lighting':'戏剧性打光','soft lighting':'柔光','oil painting':'油画',
  'penetration':'插入','doggy style':'后入式','squirting':'潮吹','lactating':'泌乳','kissing':'接吻','caressing':'爱抚','breast fondling':'揉胸','breast squeeze':'挤胸','exposed pussy':'露出阴部','creampie':'内射','multiple orgasm':'多重高潮','genital slit':'阴缝','areola':'乳晕','breast milk':'乳汁',
  'low quality':'低质量','worst quality':'最差质量','bad fingers':'坏手指','missing fingers':'缺手指','extra fingers':'多余手指','extra limbs':'多余肢体','distorted':'扭曲','text':'文字','poorly drawn face':'脸部崩坏','poorly drawn hands':'手部崩坏','poorly drawn body':'身体崩坏','ugly':'丑','morbid':'病态','multiple breasts':'多乳房','malformed limbs':'畸形肢体','gross proportions':'比例失调',
  'newest':'最新','safe':'安全(全年龄)','early':'早期','mid':'中期','recent':'近现代','old':'旧作','detailed face':'精细脸部','detailed background':'精细背景',
  'chubby':'微胖','bunny suit':'兔女郎','hand on chin':'托下巴','fingers crossed':'交叉手指','noise':'噪点','grainy':'颗粒感'
};

/* 漏进精选分类的专名（无括号的歌名/乐队/武器/企划）*/
export const AUTO_SKIP = new Set([
  'dollchestra','snapchat','gibson_flying_v','raise_a_suilen','snow_halation','knightmare_frame',
  'sparkling_daydream','happy_party_train','true_velocity_rm338','windows_media_player','umisea',
  'team_ascella','milkor_mgl','fate/accel_zero_order','omnitrix','strawpage','ragfes','supportasse','aneros'
]);

/* 强制分类：数据库标错类的专名 → 归到正确分类 */
export const FORCE_CAT = { 'fate/accel_zero_order': '版权/作品' };

/* ============ 二级标签（细分）============ */
export const SUBS = {
  '服装': {
    '全部': null,
    '上衣': ['shirt','blouse','jacket','sweater','hoodie','coat','vest','tank','t-shirt','top','cardigan'],
    '裙装': ['skirt','dress','gown','one-piece','pinafore','tube top'],
    '下装': ['pants','shorts','jeans','trousers','leggings','culottes','cargo pants'],
    '内衣/袜': ['bra','underwear','lingerie','panties','garter','bikini','swimsuit','stockings','thighhigh','pantyhose','socks','bodysuit','corset'],
    '鞋/配饰': ['shoe','boot','heel','sandal','slipper','hat','cap','ribbon','bow','scarf','glove','belt','necklace','earring','glasses','crown','tie','brooch'],
    '制服/民族': ['uniform','sailor','maid','kimono','yukata','suit','costume','armor','hanten','hakama'],
    '裸露/透视': ['nude','naked','topless','see-through','revealing','cleavage','strip','shirtless','panties only','bottomless']
  },
  '姿势 / 动作': {
    '全部': null,
    '站/坐/躺': ['standing','sitting','lying','reclining','kneeling','squatting','prone','crouching','supine'],
    '手部': ['raising hand','hands on hips','peace sign','heart hands','hand over mouth','crossed arms','pointing','holding','carrying','thumbs up','hand on'],
    '腿部': ['spread legs','leg up','crossed legs','straddling','legs apart','sitting on','knees up','wide stance'],
    '视线/转身': ['looking at viewer','looking back','looking away','turning','looking down','looking up','sideways','glancing']
  },
  'NSFW 专属': {
    '全部': null,
    '自慰': ['masturbat'],
    '性交': ['penetrat','vaginal','intercourse','fuck','threesome','spitroast','gangbang','double penetration','sextoy'],
    '口交': ['fellatio','oral','blowjob','deep throat','cum in mouth','irrumatio','cunnilingus'],
    '体液/高潮': ['cum','squirt','ejaculat','orgasm','creampie','piss','lactat','milk','drool','drooling','saliva'],
    '道具/束缚': ['dildo','vibrator','sex toy','bondage','shibari','handcuff','collar','anal beads','anal plug','paddle','chastity','rope','gag','nipple clamps'],
    '体位': ['cowgirl','doggy','missionary','reverse cowgirl','spooning','piledriver','kneeling','face sitting','lapsitting','standing sex']
  },
  '身材': {
    '全部': null,
    '胸部': ['breast','nipple','cleavage','chest','areola','tits'],
    '体型': ['slim','slender','voluptuous','petite','curvy','hourglass','thick','skinny','muscular','chubby','plump'],
    '皮肤': ['pale skin','tan','dark skin','skin','fair skin'],
    '部位': ['waist','thigh','hips','legs','ass','butt','collarbone','shoulder','abdomen','belly','armpit','feet','hands','throat']
  },
  '场景 / 背景': {
    '全部': null,
    '室内': ['bedroom','bathroom','shower','bathtub','kitchen','classroom','room','indoors','onsen','hotel','toilet','garage','balcony','library','office'],
    '室外': ['outdoors','beach','forest','city','street','garden','park','sky','ocean','sea','snow','rain','underwater','mountain','rooftop','alley','field'],
    '时间/光线': ['night','sunset','sunrise','day','dawn','morning','evening','dusk','moonlight','sunlight','rainbow']
  },
  '表情': {
    '全部': null,
    '喜悦': ['smile','grin','happy','wink','laugh','cheerful','delighted','giggle'],
    '害羞/脸红': ['blush','embarrassed','flustered','dodge','denial','shy','flushed'],
    '负面': ['sad','crying','tears','frown','angry','pout','nervous','scared','sweat','worried','annoyed','disappointed'],
    '勾引/兴奋': ['seductive','ahegao','panting','moaning','lewd','slutty','tongue out','horny','orgasm','gasm','leering']
  },
  '发型': {
    '全部': null,
    '马尾/辫/髻': ['ponytail','twintails','braid','bun','chignon','side ponytail','twin braids','low twintails','hair up'],
    '长度': ['long hair','short hair','medium hair','very long hair','shoulder-length','bob cut','hair down','short'],
    '刘海/特征': ['bangs','ahoge','sidelocks','wavy','straight','curly','blunt bangs','hair between eyes','drill hair','hair flaps','messy hair']
  },
  '眼睛 / 瞳色': {
    '全部': null,
    '瞳色': ['red eyes','blue eyes','green eyes','yellow eyes','purple eyes','pink eyes','grey eyes','black eyes','brown eyes','heterochromia','orange eyes'],
    '眼型/特征': ['large eyes','half-closed eyes','teary','closed eyes','dilated','eyelashes','eyeliner','glowing eyes','slit pupils','cross-eyed','eye contact','sparkling eyes']
  }
};

/* 二级分类词边界预编译：词干用 \w* 保留词形变化，普通词允许复数 s，并排除 top hat 等典型误抓 */
const SUB_STEMS = new Set(['masturbat','penetrat','ejaculat','lactat','squirt','thighhigh','handcuff']);
export function compileSubRegex(kws) {
  const parts = kws.map(k => {
    if (k === 'top') return 'top(?!\\s+hat)\\b';
    const e = escRegex(k);
    if (SUB_STEMS.has(k)) return e + '\\w*';
    return e + (/[a-z]$/i.test(k) && !k.endsWith('s') ? 's?\\b' : '\\b');
  });
  return new RegExp('\\b(?:' + parts.join('|') + ')', 'i');
}

export const SUBS_RE = {};
Object.entries(SUBS).forEach(([cat, subs]) => {
  SUBS_RE[cat] = {};
  Object.entries(subs).forEach(([sub, kws]) => {
    SUBS_RE[cat][sub] = kws ? compileSubRegex(kws) : null;
  });
});
