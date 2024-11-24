const fs = require('fs');
const readline = require('readline');
const { Transform } = require('stream');

if (process.argv.length < 3) {
    console.error('Не указан файл! Укажите в качестве аргумента путь к файлу');
    process.exit(1);
}

const inputFilePath = process.argv[2];
const outputFilePath = 'output.json';

class TextProcessor extends Transform {
    constructor() {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.wordCount = {};
    }

    _transform(chunk, encoding, callback) {
        const text = chunk.toString();
        const words = text
            .toLowerCase()
            .replace(/[^\w\sа-яё]/gi, '')
            .split(/\s+/)
            .filter(Boolean); // Убираем пустые строки

        for (const word of words) {
            this.wordCount[word] = (this.wordCount[word] || 0) + 1;
        }

        callback();
    }

    _flush(callback) {
        this.push(this.wordCount);
        callback();
    }
}

class Vector extends Transform {
    constructor() {
        super({ readableObjectMode: true, writableObjectMode: true });
    }

    _transform(wordCount, encoding, callback) {
        const sortedWords = Object.keys(wordCount).sort();
        const vector = sortedWords.map(word => wordCount[word]);
        this.push(vector);
        callback();
    }
}

const readStream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });
const writeStream = fs.createWriteStream(outputFilePath);

const rl = readline.createInterface({
    input: readStream,
});

const textProcessor = new TextProcessor();
const vector = new Vector();

readStream
    .pipe(textProcessor)
    .pipe(vector)
    .pipe(
        new Transform({
            writableObjectMode: true,
            transform(vector, encoding, callback) {
                this.push(JSON.stringify(vector, null, 2));
                callback();
            },
        })
    )
    .pipe(writeStream)
    .on('finish', () => {
        console.log(`Результат записан в файл: ${outputFilePath}`);
    })
