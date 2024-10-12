import { Controller, Get, Query, Res } from '@nestjs/common';
import { PronunciationService } from './pronunciation.service';
import { Response } from 'express';

@Controller('pronunciation')
export class PronunciationController {
    constructor(private readonly pronunciationService: PronunciationService) {}

    // Phương thức để lấy dữ liệu phát âm từ Google
    @Get('scrape')
    async scrapePronunciation(@Query('word') word: string, @Res() res: Response) {
        if (!word) {
            return res.status(400).json({
                code: 400,
                message: 'Yêu cầu không hợp lệ: Thiếu tham số "word',
            });
        }

        await this.pronunciationService.initializeBrowser();

        let result;
        try {
            result = await this.pronunciationService.getPronunciation(word);
        } catch (error) {
            console.error('Lỗi thu thập dữ liệu:', error);
            result = {
                code: 500,
                message: 'Lỗi  thu thập dữ liệu',
                error: error.message,
            };
        } finally {
            await this.pronunciationService.closeBrowser();
        }

        return res.status(result.code).json(result);
    }

    // Phương thức lấy dữ liệu phát âm từ cơ sở dữ liệu theo từ (word)
    @Get('by-word')
    async getPronunciationByWord(@Query('word') word: string, @Res() res: Response) {
        if (!word) {
            return res.status(400).json({
                code: 400,
                message: 'Yêu cầu không hợp lệ: Thiếu tham số "word',
            });
        }

        const result = await this.pronunciationService.getPronunciationByWord(word);
        return res.status(result.code).json(result);
    }

}
