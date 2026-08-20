const prefix='assetflow:'

export const browserStorage={
  get<T>(key:string,fallback:T):T{
    try{const value=localStorage.getItem(`${prefix}${key}`);return value===null?fallback:JSON.parse(value) as T}catch{return fallback}
  },
  set<T>(key:string,value:T){localStorage.setItem(`${prefix}${key}`,JSON.stringify(value))},
  remove(key:string){localStorage.removeItem(`${prefix}${key}`)},
}

// Chỉ dùng cho prototype. Token, mật khẩu và secret tuyệt đối không lưu ở đây.
