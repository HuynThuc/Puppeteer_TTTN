import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pronunciation } from './entities/pronunciation.entity'; // Đường dẫn đến entity của bạn
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';


@Injectable()
export class PronunciationService {
    private browser: puppeteer.Browser;

    constructor(
        @InjectRepository(Pronunciation)
        private pronunciationRepository: Repository<Pronunciation>
    ) { }

    // Khởi tạo trình duyệt
    async initializeBrowser() {
        this.browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }


    //THAM KHẢO
    // private async saveImageFromUrl(imageUrl: string, fileName: string) {
    //     // Thư mục images ở cấp độ gốc của dự án
    //     const folderPath = path.join(__dirname, '..', '..', 'images'); // Sử dụng __dirname để lấy đường dẫn hiện tại
    //     if (!fs.existsSync(folderPath)) {
    //         fs.mkdirSync(folderPath, { recursive: true });
    //     }

    //     const filePath = path.join(folderPath, fileName);

    //     // Kiểm tra và chuẩn hóa URL
    //     if (!imageUrl.startsWith('http')) {
    //         imageUrl = `https://${imageUrl}`; // Thêm https:// vào đầu URL
    //     }

    //     // In ra URL trước khi tải
    //     console.log(`Downloading image from URL: ${imageUrl}`);

    //     // Tải file hình ảnh
    //     try {
    //         const response = await axios({
    //             url: imageUrl,
    //             responseType: 'stream',
    //         });

    //         // Lưu hình ảnh vào hệ thống tệp
    //         return new Promise((resolve, reject) => {
    //             const writer = fs.createWriteStream(filePath);
    //             response.data.pipe(writer);
    //             writer.on('finish', () => {
    //                 console.log(`Image saved to ${filePath}`); // Hiển thị đường dẫn đã lưu
    //                 resolve(filePath);
    //             });
    //             writer.on('error', (err) => {
    //                 console.error(`Error saving image: ${err}`);
    //                 reject(err);
    //             });
    //         });
    //     } catch (error) {
    //         console.error(`Error fetching the image: ${error.message}`);
    //         throw new Error('Failed to download the image');
    //     }
    // }


    // Đóng trình duyệt
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async getPronunciation(word: string) {
        let page: puppeteer.Page;
        try {
            if (!this.browser) {
                throw new Error('Browser not initialized. Call initializeBrowser() first.');
            }

            // Tạo URL tìm kiếm Google
            const url = `https://www.google.com/search?q=${encodeURIComponent(word)}+pronunciation`;

            page = await this.browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Hàm để lấy dữ liệu phát âm, nhấn nút slow false and true
            const extractData = async (isSlowMode: boolean, accent: string) => {
                if (isSlowMode) {
                    await page.evaluate(() => {
                        const slowInput = document.querySelector<HTMLElement>('input[jsname="MPu53c"]');
                        if (slowInput) {
                            slowInput.click();
                        }
                        return new Promise(resolve => setTimeout(resolve, 5000));
                    });
                }

                // Lấy syllable và duration
                let list_syllable = [];
                try {
                    list_syllable = await page.$$eval('.J0Lbuc', elements =>
                        elements.map(el => ({
                            syllable: el.textContent.trim(),
                            duration: parseFloat(el.getAttribute('data-syllable-duration') || '0')
                        })).filter(item => item.syllable)
                    );
                } catch (error) {
                    console.error('Không có phát âm', error);
                }

                await new Promise(resolve => setTimeout(resolve, 10000));

                // Lấy hình ảnh và duration
                let list_pron_images = [];
                try {
                    list_pron_images = await page.$$eval('.qk2RKd', elements =>
                        elements.map(el => {
                            const imgElement = el.querySelector('img');
                            return {
                                image_url: imgElement?.getAttribute('src') || imgElement?.getAttribute('data-src') || '',
                                duration: parseFloat(el.getAttribute('data-viseme-duration') || '0')
                            };
                        }).filter(item => item.image_url)
                    );
                } catch (error) {
                    console.error('Không có hình ảnh', error);
                }


                // // Lưu từng hình ảnh vào thư mục images
                // for (const [index, image] of list_pron_images.entries()) {
                //     // Kiểm tra xem URL có chứa định dạng file không
                //     const extension = image.image_url.includes('.svg') ? 'svg' : 'png';
                //     const fileName = `${word}-${accent}-${isSlowMode ? 'slow' : 'normal'}-${index}.${extension}`;
                    
                //     await this.saveImageFromUrl(image.image_url, fileName);
                // }
                


                return { mode: isSlowMode ? 'slow' : 'normal', list_syllable, list_pron_images };
            };

            // Lấy dữ liệu giọng Mỹ
            const americanNormalData = await extractData(false, 'en-us');
            const americanSlowData = await extractData(true, 'en-us');

            // Lưu dữ liệu vào cơ sở dữ liệu theo từ
            await this.pronunciationRepository.save([
                {
                    word: word, // Lưu từ
                    mode: americanNormalData.mode, //Lưu mode nomal và slow
                    accent: 'en-us', //lưu accent giọng Mỹ
                    list_syllable: americanNormalData.list_syllable, //lưu danh sách phát âm và duration
                    list_pron_images: americanNormalData.list_pron_images //lưu danh sách hình ảnh và duration
                },
                {
                    word: word, // Lưu từ
                    mode: americanSlowData.mode,
                    accent: 'en-us',
                    list_syllable: americanSlowData.list_syllable,
                    list_pron_images: americanSlowData.list_pron_images
                }
            ]);

            // Click tắt nút Slow
            await page.evaluate(() => {
                const slowInput = document.querySelector<HTMLInputElement>('input[jsname="MPu53c"]');
                if (slowInput && slowInput.checked) {
                    slowInput.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Click dropdown
            await page.evaluate(() => {
                const dropdownButton = document.querySelector<HTMLElement>('.en8Ssd');
                if (dropdownButton) {
                    dropdownButton.click();
                }
            });
            // Click chọn giọng Anh
            await page.evaluate(() => {
                const britishOption = document.querySelector<HTMLElement>('g-menu-item[data-country="gb"]');
                if (britishOption) {
                    britishOption.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // Lấy dữ liệu giọng Anh
            const britishNormalData = await extractData(false, 'en-uk');
            const britishSlowData = await extractData(true, 'en-uk');

            // Lưu dữ liệu vào cơ sở dữ liệu theo từ
            await this.pronunciationRepository.save([
                {
                    word: word, // Lưu từ
                    mode: britishNormalData.mode, //Lưu mode nomal và slow
                    accent: 'en-uk', //lưu accent giọng Anh
                    list_syllable: britishNormalData.list_syllable, //lưu danh sách phát âm và duration
                    list_pron_images: britishNormalData.list_pron_images //lưu danh sách hình ảnh và duration
                },
                {
                    word: word, // Lưu từ
                    mode: britishSlowData.mode,
                    accent: 'en-uk',
                    list_syllable: britishSlowData.list_syllable,
                    list_pron_images: britishSlowData.list_pron_images
                }
            ]);

            return {
                code: 200,
                message: 'success',
                data: {
                    "en-us": [americanNormalData, americanSlowData],
                    "en-uk": [britishNormalData, britishSlowData]
                }
            };

        } catch (error) {
            console.error('Error fetching pronunciation:', error);
            return {
                code: 500,
                message: 'Error fetching pronunciation',
                error: error.message
            };
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    //Phương thức lấy dữ liệu theo từ (word)
    async getPronunciationByWord(word: string) {
        const pronunciations = await this.pronunciationRepository.find({ where: { word } });
        if (pronunciations.length === 0) {
            return {
                code: 404,
                message: 'Không tìm thấy dữ liệu',
            };
        }
        return {
            code: 200,
            message: 'success',
            data: pronunciations,
        };
    }
}
