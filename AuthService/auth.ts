
// all optional due to the flexibly to add more auth tokens in the future *email and pass must be used together do not forget*

export type credentials = {
    email?: string,
    password?: string,
    JwtToken?:string,
}





export interface auth {
    getAuth(credentials:credentials): Promise<boolean>;   // authorized = true  authorized = false;
    removeAuth(accountId : string) : Promise<boolean>; // successfully logged out  = true   did not log out = false;
    
}



