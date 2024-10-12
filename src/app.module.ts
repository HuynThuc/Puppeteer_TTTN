import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PronunciationModule } from './pronunciation/pronunciation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'postgres',
      password: '123456',  // Password bạn đã thiết lập trong lệnh docker run
      database: 'pronunciation_db',        // Tên database (tạo mới hoặc đã có)
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,             // Tự động sync database schema (bạn có thể tắt sau khi phát triển)
    }),
    PronunciationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
