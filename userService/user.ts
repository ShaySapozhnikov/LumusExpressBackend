

export abstract class User{
  protected username: string;
  protected accountId: string;
  protected email: string;

  constructor(username: string, accountId: string, email: string) {
    this.username = username;
    this.accountId = accountId;
    this.email = email;
    
  }

  getUsername(): string {
    
    return this.username;
  }

  setUsername(username: string): void {
    this.username = username;
  }

  getAccountId(): string {
    return this.accountId;
  }

  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  getEmail(): string {
    return this.email;
  }

  setEmail(email: string): void {
    this.email = email;
  }
}
