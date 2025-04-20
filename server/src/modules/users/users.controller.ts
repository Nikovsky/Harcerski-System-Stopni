import { Controller, Body, Post, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

}
