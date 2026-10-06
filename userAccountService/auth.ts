
// all optional due to the flexibly to add more auth tokens in the future *email and pass must be used together do not forget*


import type {User} from './user';




export type credentials = {
    email?: string,
    password?: string,
    JwtToken?:string,
}

export interface auth extends User {
    getAuth(credentials:credentials): boolean;   // authorized = true  authorized = false;
    removeAuth(accountId : string) : boolean; // successfully logged out  = true   did not log out = false;
}



