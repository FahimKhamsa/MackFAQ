import { IsString, Length } from "class-validator";

export class ILoginParams {
    @IsString()
    @Length(2, 255)
    email: string;

    @IsString()
    @Length(5, 255)
    password: string;
}

export class I2FaParams {
    @IsString()
    @Length(4, 4)
    code: string;
}

export class ILoginWithToken {
    @IsString()
    @Length(2, 255)
    email: string;
}