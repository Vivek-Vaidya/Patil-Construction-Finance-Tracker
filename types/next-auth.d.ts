import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    mustChangePassword: boolean;
    id: string;
  }
}
