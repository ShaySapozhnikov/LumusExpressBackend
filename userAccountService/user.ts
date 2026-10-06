export abstract class User {

    username: string;

    accountId: string;

    email : string


    constructor(username: string, accountId: string, email:string) {
        this.username = username;
        this.accountId = accountId;
        this.email = email
    
        
    } 


    getUserName() : string {
        return this.username;
    }

    setUserName(username: string){
        this.username = username;
    }

    getAccountId() : string{
        return this.accountId;
    }

    setAccountId(accountId : string){
        return this.accountId;
    }

    getAccountEmail() : string{
        return this.email;   
    }

    setAccountEmail(email: string){
        this.email = email;
    }
}