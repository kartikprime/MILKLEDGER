const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Kartik\\.gemini\\antigravity\\brain\\3d064ef3-0b90-4356-9883-9ead40d5df25\\.tempmediaStorage';
const destDir = 'c:\\Users\\Kartik\\Desktop\\MILKLEDGER\\src\\assets';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir)
  .filter(f => f.startsWith('media_') && f.endsWith('.png'))
  .map(f => ({ name: f, time: fs.statSync(path.join(srcDir, f)).mtime.getTime() }))
  .sort((a, b) => b.time - a.time);

if (files.length >= 2) {
  fs.copyFileSync(path.join(srcDir, files[0].name), path.join(destDir, 'father1.png'));
  fs.copyFileSync(path.join(srcDir, files[1].name), path.join(destDir, 'father2.png'));
  console.log('Copied files to assets!');
} else {
  console.log('Not enough media files found.');
}
