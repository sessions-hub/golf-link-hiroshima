export type CourseEntry = {
  id: string
  venueName: string
  subCourse?: string
  name: string
  address: string
  lat: number
  lng: number
  holes: 9 | 18
  par: number
  pars: number[]
}

export const COURSES: CourseEntry[] = [
  {
    id: 'hiroshima-gc-suzugamine',
    venueName: '広島ゴルフ倶楽部鈴が峰コース',
    name: '広島ゴルフ倶楽部鈴が峰コース',
    address: '広島県広島市佐伯区五日市町皆賀413',
    lat: 34.38409392135982,
    lng: 132.37451704417907,
    holes: 18,
    par: 71,
    pars: [4,4,5,4,4,4,4,3,4,3,5,5,3,4,4,3,4,4],
  },
  {
    id: 'higashi-hiroshima-gc-south',
    venueName: '東広島ゴルフクラブ',
    subCourse: '南コース',
    name: '東広島ゴルフクラブ 南コース',
    address: '広島県東広島市志和町志和東10671-29',
    lat: 34.48132584903143,
    lng: 132.6607160454848,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,3,5,4,4,4,3,4,4,5,4,3,4,5],
  },
  {
    id: 'higashi-hiroshima-gc-north',
    venueName: '東広島ゴルフクラブ',
    subCourse: '北コース',
    name: '東広島ゴルフクラブ 北コース',
    address: '広島県東広島市志和町志和東10671-29',
    lat: 34.48132584903143,
    lng: 132.6607160454848,
    holes: 18,
    par: 72,
    pars: [4,5,3,4,5,4,4,3,4,5,4,4,3,4,4,5,3,4],
  },
  {
    id: 'kure-cc',
    venueName: '呉カントリークラブ',
    name: '呉カントリークラブ',
    address: '広島県呉市安浦町大字安登11163-2',
    lat: 34.26056834482326,
    lng: 132.73850322883584,
    holes: 18,
    par: 72,
    pars: [4,5,4,3,5,4,4,3,4,5,5,4,3,4,4,4,3,4],
  },
  {
    id: 'mihara-cc',
    venueName: '三原カンツリークラブ',
    name: '三原カンツリークラブ',
    address: '広島県三原市沼田東町釜山10345-6',
    lat: 34.36524114284824,
    lng: 133.00943359999997,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,4,4,3,5,4,5,3,4,5,3,4,4,4],
  },
  {
    id: 'onomichi-cc-uneyama',
    venueName: '尾道カントリークラブ 宇根山コース',
    name: '尾道カントリークラブ 宇根山コース',
    address: '広島県世羅郡世羅町大字小世良10691-15',
    lat: 34.55502663970271,
    lng: 133.07887702713643,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,5,4,3,4,4,4,3,4,4,5,4,3,5,4],
  },
  {
    id: 'fukuyama-cc',
    venueName: '福山カントリークラブ',
    name: '福山カントリークラブ',
    address: '広島県福山市神辺町東中条498',
    lat: 34.58600510664256,
    lng: 133.39217798650708,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,5,4,3,4,4,5,4,4,3,5,4,4,3,4],
  },
  {
    id: 'shobara-cc',
    venueName: '庄原カントリークラブ',
    name: '庄原カントリークラブ',
    address: '広島県庄原市板橋町600',
    lat: 34.823153168988824,
    lng: 133.01376708465716,
    holes: 18,
    par: 72,
    pars: [4,4,3,5,4,3,4,4,5,4,5,4,3,5,4,4,3,4],
  },
  {
    id: 'hiroshima-country-saijo',
    venueName: '広島カンツリー倶楽部 西条コース',
    name: '広島カンツリー倶楽部 西条コース',
    address: '広島県東広島市西条町下三永730-10',
    lat: 34.386714089685164,
    lng: 132.7733164576714,
    holes: 18,
    par: 72,
    pars: [5,5,3,4,4,4,4,3,4,5,4,4,3,4,4,3,4,5],
  },
  {
    id: 'hiroshima-country-hachihon',
    venueName: '広島カンツリー倶楽部 八本松コース',
    name: '広島カンツリー倶楽部 八本松コース',
    address: '広島県東広島市八本松町原11083-1',
    lat: 34.40040554271201,
    lng: 132.69301265935388,
    holes: 18,
    par: 72,
    pars: [4,4,3,4,3,4,5,5,4,4,3,5,4,4,5,4,3,4],
  },
  {
    id: 'setouchi-golf-resort',
    venueName: '瀬戸内ゴルフリゾート',
    name: '瀬戸内ゴルフリゾート',
    address: '広島県竹原市吉名町831',
    lat: 34.30632837803552,
    lng: 132.86436791164033,
    holes: 18,
    par: 72,
    pars: [4,3,5,4,4,4,3,5,4,4,4,4,3,5,3,4,5,4],
  },
  {
    id: 'takehara-cc',
    venueName: '竹原カントリークラブ',
    name: '竹原カントリークラブ',
    address: '広島県竹原市小梨町字堂平2022',
    lat: 34.38329309565446,
    lng: 132.9202222711643,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,3,5,4,4,4,4,3,5,4,5,3,4,4],
  },
  {
    id: 'kamo-cc',
    venueName: '賀茂カントリークラブ',
    name: '賀茂カントリークラブ',
    address: '広島県東広島市高屋町高屋東4102',
    lat: 34.44364383817549,
    lng: 132.81266611349292,
    holes: 18,
    par: 72,
    pars: [5,4,3,5,4,4,4,3,4,5,4,3,4,5,4,3,4,4],
  },
  {
    id: 'hiroshima-momiji-maruko',
    venueName: '広島紅葉カントリークラブ',
    subCourse: '丸子コース',
    name: '広島紅葉カントリークラブ 丸子コース',
    address: '広島県廿日市市友田220-3',
    lat: 34.32220708066874,
    lng: 132.1850644711643,
    holes: 9,
    par: 36,
    pars: [4,4,4,3,5,4,4,3,5],
  },
  {
    id: 'hiroshima-momiji-mikura',
    venueName: '広島紅葉カントリークラブ',
    subCourse: '三倉コース',
    name: '広島紅葉カントリークラブ 三倉コース',
    address: '広島県廿日市市友田220-3',
    lat: 34.32220708066874,
    lng: 132.1850644711643,
    holes: 9,
    par: 36,
    pars: [5,3,4,5,4,3,4,4,4],
  },
  {
    id: 'hiroshima-momiji-minosegawa',
    venueName: '広島紅葉カントリークラブ',
    subCourse: '三ノ瀬コース',
    name: '広島紅葉カントリークラブ 三ノ瀬コース',
    address: '広島県廿日市市友田220-3',
    lat: 34.32220708066874,
    lng: 132.1850644711643,
    holes: 9,
    par: 36,
    pars: [4,5,4,5,3,4,3,4,4],
  },
  {
    id: 'hakuryuko-cc',
    venueName: '白竜湖カントリークラブ',
    name: '白竜湖カントリークラブ',
    address: '広島県三原市大和町和木3262',
    lat: 34.49219017642524,
    lng: 132.9142808717075,
    holes: 18,
    par: 72,
    pars: [5,3,4,4,4,4,3,5,4,5,4,5,3,4,4,4,3,4],
  },
  {
    id: 'hiroshima-kokusai-gc',
    venueName: '広島国際ゴルフ倶楽部',
    name: '広島国際ゴルフ倶楽部',
    address: '広島県東広島市黒瀬町南方10199-70',
    lat: 34.32280712033421,
    lng: 132.7058696962981,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,5,4,3,4,4,3,4,5,4,4,3,4,5],
  },
  {
    id: 'aki-cc',
    venueName: '安芸カントリークラブ',
    name: '安芸カントリークラブ',
    address: '広島県東広島市河内町入野11957-6',
    lat: 34.42307582588974,
    lng: 132.8672270288357,
    holes: 18,
    par: 72,
    pars: [4,4,3,4,4,5,3,4,5,5,4,4,4,3,5,3,4,4],
  },
  {
    id: 'otagawa-gion',
    venueName: '太田川ゴルフ場',
    subCourse: '祇園コース',
    name: '太田川ゴルフ場 祇園コース',
    address: '広島県広島市安佐南区東原1-22-11',
    lat: 34.44035621642237,
    lng: 132.47825502644258,
    holes: 9,
    par: 32,
    pars: [4,5,3,4,3,3,3,3,4],
  },
  {
    id: 'otagawa-hesaka',
    venueName: '太田川ゴルフ場',
    subCourse: '戸坂コース',
    name: '太田川ゴルフ場 戸坂コース',
    address: '広島県広島市安佐南区東原1-22-11',
    lat: 34.44035621642237,
    lng: 132.47825502644258,
    holes: 9,
    par: 30,
    pars: [3,3,3,3,3,3,3,4,5],
  },
  {
    id: 'onomichi-uzushio-cc',
    venueName: '尾道うずしおカントリークラブ',
    name: '尾道うずしおカントリークラブ',
    address: '広島県尾道市原田町梶山田1069',
    lat: 34.46850229417054,
    lng: 133.20554652883573,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,4,3,5,4,5,4,4,3,4,5,4,3,4],
  },
  {
    id: 'onomichi-gc',
    venueName: '尾道ゴルフ倶楽部',
    name: '尾道ゴルフ倶楽部',
    address: '広島県三原市久井町吉田735-32',
    lat: 34.52404484962687,
    lng: 133.0640444576714,
    holes: 18,
    par: 72,
    pars: [5,3,4,4,4,5,4,4,3,4,3,4,5,4,4,4,3,5],
  },
  {
    id: 'country-park-senyo',
    venueName: 'カントリーパーク仙養',
    name: 'カントリーパーク仙養',
    address: '広島県神石郡神石高原町近田835',
    lat: 34.74201495363192,
    lng: 133.3112604865071,
    holes: 18,
    par: 66,
    pars: [4,4,4,3,4,3,5,3,3,5,3,4,3,4,4,3,4,3],
  },
  {
    id: 'kyoran-cc-east',
    venueName: '京覧カントリークラブ',
    subCourse: '東コース',
    name: '京覧カントリークラブ 東コース',
    address: '広島県三原市長谷町291',
    lat: 34.4117773408375,
    lng: 133.03315330924977,
    holes: 9,
    par: 36,
    pars: [4,3,5,4,3,4,4,5,4],
  },
  {
    id: 'kyoran-cc-middle',
    venueName: '京覧カントリークラブ',
    subCourse: '中コース',
    name: '京覧カントリークラブ 中コース',
    address: '広島県三原市長谷町291',
    lat: 34.4117773408375,
    lng: 133.03315330924977,
    holes: 9,
    par: 36,
    pars: [5,4,3,4,4,5,3,4,4],
  },
  {
    id: 'kyoran-cc-west',
    venueName: '京覧カントリークラブ',
    subCourse: '西コース',
    name: '京覧カントリークラブ 西コース',
    address: '広島県三原市長谷町291',
    lat: 34.4117773408375,
    lng: 133.03315330924977,
    holes: 9,
    par: 36,
    pars: [4,4,4,5,3,4,4,3,5],
  },
  {
    id: 'kui-cc',
    venueName: '久井カントリークラブ',
    name: '久井カントリークラブ',
    address: '広島県三原市久井町坂井原755',
    lat: 34.50234156257973,
    lng: 133.0519336711643,
    holes: 18,
    par: 72,
    pars: [4,5,3,4,4,4,3,4,5,4,3,4,4,5,3,4,4,5],
  },
  {
    id: 'green-birds-gc',
    venueName: 'グリーンバーズゴルフ倶楽部',
    name: 'グリーンバーズゴルフ倶楽部',
    address: '広島県三原市大和町大草20905-37',
    lat: 34.51711388533775,
    lng: 132.96566561349286,
    holes: 18,
    par: 72,
    pars: [4,5,4,3,4,5,3,4,4,4,4,3,5,4,3,4,5,4],
  },
  {
    id: 'genan-cc',
    venueName: '芸南カントリークラブ',
    name: '芸南カントリークラブ',
    address: '広島県廿日市市玖島235',
    lat: 34.4067437956904,
    lng: 132.28060462698573,
    holes: 18,
    par: 72,
    pars: [4,5,4,4,3,4,3,4,5,4,5,3,4,4,4,4,3,5],
  },
  {
    id: 'gobara-cc',
    venueName: '郷原カントリークラブ',
    name: '郷原カントリークラブ',
    address: '広島県呉市郷原町西横尾412',
    lat: 34.30967312077483,
    lng: 132.619743,
    holes: 18,
    par: 72,
    pars: [4,3,4,5,4,4,3,5,4,4,5,4,3,4,5,4,3,4],
  },
  {
    id: 'shinichi-classic-gc',
    venueName: '新市クラシックゴルフクラブ',
    name: '新市クラシックゴルフクラブ',
    address: '広島県福山市新市町戸手3103-1',
    lat: 34.563105786893146,
    lng: 133.28284585397148,
    holes: 18,
    par: 72,
    pars: [4,5,3,4,3,4,5,4,4,4,5,4,3,4,4,4,3,5],
  },
  {
    id: 'takanonasu-gc',
    venueName: '鷹の巣ゴルフクラブ',
    name: '鷹の巣ゴルフクラブ',
    address: '広島県廿日市市河津原137-2',
    lat: 34.37011553001112,
    lng: 132.2040589730142,
    holes: 18,
    par: 72,
    pars: [4,4,3,4,5,4,5,3,4,4,4,5,3,4,4,3,4,5],
  },
  {
    id: 'chiyoda-gc',
    venueName: '千代田ゴルフ倶楽部',
    name: '千代田ゴルフ倶楽部',
    address: '広島県山県郡北広島町寺原2851',
    lat: 34.696192130994945,
    lng: 132.48330742112208,
    holes: 18,
    par: 72,
    pars: [5,4,4,3,4,4,5,3,4,4,5,4,4,3,5,4,3,4],
  },
  {
    id: 'toyama-cc',
    venueName: '戸山カンツリークラブ',
    name: '戸山カンツリークラブ',
    address: '広島県広島市安佐南区沼田町阿戸字城山1568-1',
    lat: 34.49284801885823,
    lng: 132.35558608650712,
    holes: 18,
    par: 72,
    pars: [4,4,4,3,5,4,3,5,4,5,4,3,4,4,3,5,4,4],
  },
  {
    id: 'hiroshima-asa-gc',
    venueName: '広島安佐ゴルフクラブ',
    name: '広島安佐ゴルフクラブ',
    address: '広島県広島市安佐北区安佐町筒瀬1471-21',
    lat: 34.48875391139654,
    lng: 132.4642299386287,
    holes: 18,
    par: 72,
    pars: [4,4,5,3,5,4,3,4,4,5,3,4,4,4,3,4,5,4],
  },
  {
    id: 'hiroshima-nishi-cc',
    venueName: '広島西カントリー倶楽部',
    name: '広島西カントリー倶楽部',
    address: '広島県廿日市市大野2392',
    lat: 34.31614874442181,
    lng: 132.1744223865071,
    holes: 18,
    par: 72,
    pars: [4,3,4,4,5,4,3,5,4,4,3,4,4,5,3,5,4,4],
  },
  {
    id: 'fukuyama-gc',
    venueName: '福山ゴルフ倶楽部',
    name: '福山ゴルフ倶楽部',
    address: '広島県福山市御幸町中津原1225-1',
    lat: 34.52699754445625,
    lng: 133.36117365582146,
    holes: 18,
    par: 72,
    pars: [5,4,4,3,3,5,4,3,5,5,4,4,3,3,5,4,3,5],
  },
  {
    id: 'fukuyama-higashi-gc',
    venueName: '福山東ゴルフクラブ',
    name: '福山東ゴルフクラブ',
    address: '広島県福山市春日町宇山137',
    lat: 34.52757163642492,
    lng: 133.3979250991147,
    holes: 18,
    par: 72,
    pars: [4,4,3,5,4,3,4,5,4,4,5,4,4,3,5,3,4,4],
  },
  {
    id: 'hongo-cc',
    venueName: '本郷カントリー倶楽部',
    name: '本郷カントリー倶楽部',
    address: '広島県三原市本郷町南方松屋根1251-1',
    lat: 34.3867006279245,
    lng: 132.9490090865071,
    holes: 18,
    par: 72,
    pars: [5,4,3,4,4,5,4,3,4,4,3,4,5,4,4,4,3,5],
  },
  {
    id: 'matsunaga-cc',
    venueName: '松永カントリークラブ',
    name: '松永カントリークラブ',
    address: '広島県福山市神村町1388',
    lat: 34.47734159836619,
    lng: 133.2608118423286,
    holes: 18,
    par: 72,
    pars: [4,4,4,3,4,5,3,4,5,4,3,4,4,4,5,4,5,3],
  },
  {
    id: 'miyajima-cc',
    venueName: '宮島カンツリー倶楽部',
    name: '宮島カンツリー倶楽部',
    address: '広島県広島市佐伯区三宅町1050',
    lat: 34.37680391667378,
    lng: 132.3379914576714,
    holes: 18,
    par: 70,
    pars: [4,4,3,5,4,4,4,3,4,4,4,3,5,4,4,4,3,4],
  },
  {
    id: 'miyajima-shiwa-cc',
    venueName: '宮島志和カンツリー倶楽部',
    name: '宮島志和カンツリー倶楽部',
    address: '広島県東広島市志和町大字七条椛坂488-2',
    lat: 34.46697010438298,
    lng: 132.64715907301428,
    holes: 18,
    par: 72,
    pars: [4,5,4,4,3,4,4,3,5,5,4,3,4,4,3,4,5,4],
  },
  {
    id: 'yachiyo-cc-river',
    venueName: '八千代カントリークラブ',
    subCourse: 'リバーコース',
    name: '八千代カントリークラブ リバーコース',
    address: '広島県安芸高田市八千代町佐々井979-1',
    lat: 34.6306810345992,
    lng: 132.60179880424306,
    holes: 9,
    par: 36,
    pars: [4,3,4,3,5,4,4,5,4],
  },
  {
    id: 'yachiyo-cc-route',
    venueName: '八千代カントリークラブ',
    subCourse: 'ルートコース',
    name: '八千代カントリークラブ ルートコース',
    address: '広島県安芸高田市八千代町佐々井979-1',
    lat: 34.6306810345992,
    lng: 132.60179880424306,
    holes: 9,
    par: 36,
    pars: [4,4,4,3,5,5,3,4,4],
  },
  {
    id: 'yachiyo-cc-lake',
    venueName: '八千代カントリークラブ',
    subCourse: 'レイクコース',
    name: '八千代カントリークラブ レイクコース',
    address: '広島県安芸高田市八千代町佐々井979-1',
    lat: 34.6306810345992,
    lng: 132.60179880424306,
    holes: 9,
    par: 36,
    pars: [4,5,3,5,3,4,4,4,4],
  },
  {
    id: 'regias-crest-grand',
    venueName: 'リージャスクレストゴルフクラブ',
    subCourse: 'グランド',
    name: 'リージャスクレストゴルフクラブ グランド',
    address: '広島県安芸高田市高宮町房後856',
    lat: 34.74481798310975,
    lng: 132.7305217353453,
    holes: 18,
    par: 72,
    pars: [5,4,4,3,5,4,3,4,4,5,4,3,4,4,4,3,4,5],
  },
  {
    id: 'regias-crest-royal',
    venueName: 'リージャスクレストゴルフクラブ',
    subCourse: 'ロイヤル',
    name: 'リージャスクレストゴルフクラブ ロイヤル',
    address: '広島県安芸高田市高宮町房後816',
    lat: 34.747716719795505,
    lng: 132.74379359353048,
    holes: 18,
    par: 72,
    pars: [4,5,4,3,4,4,5,3,4,4,5,4,3,4,4,3,4,5],
  },
]

export type CourseCombo = {
  label: string
  courses: string[]
}

export type CourseComboGroup = {
  groupName: string
  combos: CourseCombo[]
}

export const COURSE_COMBOS: CourseComboGroup[] = [
  {
    groupName: '広島紅葉カントリークラブ',
    combos: [
      { label: '丸子 + 三倉コース', courses: ['hiroshima-momiji-maruko', 'hiroshima-momiji-mikura'] },
      { label: '丸子 + 三ノ瀬コース', courses: ['hiroshima-momiji-maruko', 'hiroshima-momiji-minosegawa'] },
      { label: '三倉 + 三ノ瀬コース', courses: ['hiroshima-momiji-mikura', 'hiroshima-momiji-minosegawa'] },
    ],
  },
  {
    groupName: '太田川ゴルフ場',
    combos: [
      { label: '祇園 + 戸坂コース', courses: ['otagawa-gion', 'otagawa-hesaka'] },
    ],
  },
  {
    groupName: '京覧カントリークラブ',
    combos: [
      { label: '東 + 中コース', courses: ['kyoran-cc-east', 'kyoran-cc-middle'] },
      { label: '東 + 西コース', courses: ['kyoran-cc-east', 'kyoran-cc-west'] },
      { label: '中 + 西コース', courses: ['kyoran-cc-middle', 'kyoran-cc-west'] },
      { label: '東 + 中 + 西コース（27H）', courses: ['kyoran-cc-east', 'kyoran-cc-middle', 'kyoran-cc-west'] },
    ],
  },
  {
    groupName: '八千代カントリークラブ',
    combos: [
      { label: 'リバー + ルートコース', courses: ['yachiyo-cc-river', 'yachiyo-cc-route'] },
      { label: 'リバー + レイクコース', courses: ['yachiyo-cc-river', 'yachiyo-cc-lake'] },
      { label: 'ルート + レイクコース', courses: ['yachiyo-cc-route', 'yachiyo-cc-lake'] },
    ],
  },
]

export const VENUE_NAMES = [...new Set(COURSES.map(c => c.venueName))]

export function searchVenues(query: string): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return VENUE_NAMES.filter(n => n.toLowerCase().includes(q)).slice(0, 8)
}

// GORA APIが返す名称と courses.ts の venueName が大きく異なるケースの明示マッピング
const GORA_VENUE_ALIASES: Record<string, string> = {
  'スポーツヴィレッジ白竜湖': '白竜湖カントリークラブ',
}

function normalizeCourseName(s: string): string {
  return s
    .replace(/\s+|　/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
}

// GORAのgolfCourseNameを受け取り、courses.tsの対応エントリを返す
// スコアページではVENUE_NAMESから渡るため完全一致が優先される
export function getVenueCourses(goraOrVenueName: string): CourseEntry[] {
  // 1. 明示エイリアス
  const aliased = GORA_VENUE_ALIASES[goraOrVenueName]
  if (aliased) {
    const r = COURSES.filter(c => c.venueName === aliased)
    if (r.length > 0) return r
  }

  // 2. venueName 完全一致
  const byVenue = COURSES.filter(c => c.venueName === goraOrVenueName)
  if (byVenue.length > 0) return byVenue

  const normQuery = normalizeCourseName(goraOrVenueName)

  // 3. name 正規化完全一致（"リージャスクレストゴルフクラブ グランド" → "リージャスクレストゴルフクラブグランド"）
  const byName = COURSES.filter(c => normalizeCourseName(c.name) === normQuery)
  if (byName.length > 0) return byName

  // 4. venueName 正規化完全一致（スペース差異を吸収）
  const byNormVenue = COURSES.filter(c => normalizeCourseName(c.venueName) === normQuery)
  if (byNormVenue.length > 0) return byNormVenue

  // 5. 包含一致（GORA名がvenueNameを含む、またはその逆）
  return COURSES.filter(c => {
    const normVenue = normalizeCourseName(c.venueName)
    return normQuery.includes(normVenue) || normVenue.includes(normQuery)
  })
}

export function getCourseById(id: string): CourseEntry | undefined {
  return COURSES.find(c => c.id === id)
}

export function getGroupCombos(venueName: string): CourseCombo[] {
  return COURSE_COMBOS.find(g => g.groupName === venueName)?.combos ?? []
}
