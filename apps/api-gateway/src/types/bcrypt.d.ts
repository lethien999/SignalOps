declare module 'bcrypt' {
  export function hash(value: string, saltRounds: number): Promise<string>;
  export function compare(value: string, hashedValue: string): Promise<boolean>;
}
