export interface ApiError{code:string;message:string;details?:unknown}
export interface Pagination{page:number;size:number;total:number}
export type Role='ADMIN'|'CASHIER'|'TRAINER'|'MEMBER';
