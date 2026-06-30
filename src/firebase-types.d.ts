// Type shim: firebase v10 doesn't ship sub-module .d.ts files at the expected
// paths in some npm distributions. Re-export from the underlying @firebase/* packages.
declare module 'firebase/app' {
  export * from '@firebase/app'
}

declare module 'firebase/firestore' {
  export * from '@firebase/firestore'
}
