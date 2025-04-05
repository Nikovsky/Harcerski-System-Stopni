import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
    ADMIN = 'admin',
    PRZEWODNICZACY_KI = 'chairperson',
    CZLONEK_KI = "member",
    SEKRETARZ = "secretary",
    UZYTKOWNIK = "user",
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 45, nullable: true })
    firstName: string;

    @Column({ type: 'varchar', length: 65, nullable: true })
    lastName: string;

    @Column( {type: 'varchar', length: 100})
    email: string;

    @Column()
    password: string;

    @Column( { type: 'enum', enum: UserRole, default: UserRole.UZYTKOWNIK })
    role: UserRole;

    @CreateDateColumn()
    createdAt: Date;
}