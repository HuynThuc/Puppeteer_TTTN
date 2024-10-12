import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pronunciation')
export class Pronunciation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    word: string; // Trường lưu từ

    @Column()
    mode: string;

    @Column()
    accent: string;

    @Column('json')
    list_syllable: any; // Hoặc kiểu dữ liệu khác phù hợp

    @Column('json')
    list_pron_images: any; // Hoặc kiểu dữ liệu khác phù hợp
}
