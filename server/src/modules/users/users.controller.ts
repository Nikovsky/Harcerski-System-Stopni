/**
 * @file src/modules/users/users.controller.ts
 * @description Controller handling user-related endpoints.
 */
import { Controller, Body, Post, Get } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * @description Controller exposing routes related to user operations and management.
 */
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

}
