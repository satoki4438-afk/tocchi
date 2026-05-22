export const MUNICIPALITY_LINKS = {
  '17201': {
    city: '金沢市',
    pref: '石川県',
    officialSite: 'https://www4.city.kanazawa.lg.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
  '17205': {
    city: '小松市',
    pref: '石川県',
    officialSite: 'https://www.city.komatsu.lg.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
  '17206': {
    city: '加賀市',
    pref: '石川県',
    officialSite: 'https://www.city.kaga.ishikawa.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
  '17209': {
    city: '白山市',
    pref: '石川県',
    officialSite: 'https://www.city.hakusan.lg.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
  '17210': {
    city: '能美市',
    pref: '石川県',
    officialSite: 'https://www.city.nomi.ishikawa.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
  '17211': {
    city: '野々市市',
    pref: '石川県',
    officialSite: 'https://www.city.nonoichi.lg.jp',
    links: {
      roadMap:        { label: '指定道路図',       url: null, supportsLatLng: false, supportsAddress: false },
      cityPlanMap:    { label: '都市計画図',        url: null, supportsLatLng: false, supportsAddress: false },
      hazardMap:      { label: 'ハザードマップ',    url: null, supportsLatLng: false, supportsAddress: false },
      firePrevention: { label: '防火・準防火地域',  url: null, supportsLatLng: false, supportsAddress: false },
      waterSewer:     { label: '上下水道確認',      url: null, supportsLatLng: false, supportsAddress: false },
      culturalAssets: { label: '埋蔵文化財確認',   url: null, supportsLatLng: false, supportsAddress: false },
    },
  },
}

export function getMunicipalityLinks(muniCd) {
  return MUNICIPALITY_LINKS[muniCd] || null
}
