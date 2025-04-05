import {IsEmail, IsString, IsOptional, Min, MinLength} from 'class-validator'

export class CreateUserDto {

    @IsOptional()
    @IsString()
    firstName: string;

    @IsOptional()
    @IsString()
    lastName: string;

    @IsEmail()
    @MinLength(5)
    email: string;

    @IsString()
    password: string;
}