class MemeGenerator {
    constructor() {
        this.canvas = document.getElementById('memeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentImage = null;
        this.textElements = []; // Array to store text elements
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.templates = [
            { id: 1, name: 'Drake Pointing', url: 'https://i.imgflip.com/30b1gx.jpg' },
            { id: 2, name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' },
            { id: 3, name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg' },
            { id: 4, name: 'Mocking SpongeBob', url: 'https://i.imgflip.com/1otk96.jpg' },
            { id: 5, name: 'Woman Yelling at Cat', url: 'https://i.imgflip.com/345v97.jpg' },
            { id: 6, name: 'This is Fine', url: 'https://i.imgflip.com/26am.jpg' },
            { id: 7, name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg' },
            { id: 8, name: 'Expanding Brain', url: 'https://i.imgflip.com/1jwhww.jpg' }
        ];
        
        this.init();
    }

    init() {
        this.loadTemplates();
        this.setupEventListeners();
        this.drawPlaceholder();
        this.updateRangeValues();
        this.setupCanvasEvents();
        // Automatically fetch a random meme on load
        this.fetchRandomMeme();
    }

    loadTemplates() {
        const grid = document.getElementById('templatesGrid');
        grid.innerHTML = '';
        
        this.templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `
                <img src="${template.url}" alt="${template.name}" crossorigin="anonymous">
                <div class="template-name">${template.name}</div>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.template-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');
                this.loadImage(template.url);
            });
            
            grid.appendChild(item);
        });
    }

    setupEventListeners() {
        // Text input and add button
        document.getElementById('addTextBtn').addEventListener('click', () => {
            const textInput = document.getElementById('textInput');
            if (textInput.value.trim()) {
                this.addTextElement(textInput.value);
                textInput.value = '';
                this.updateTextElementsList();
            }
        });

        document.getElementById('textInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const textInput = document.getElementById('textInput');
                if (textInput.value.trim()) {
                    this.addTextElement(textInput.value);
                    textInput.value = '';
                    this.updateTextElementsList();
                }
            }
        });

        // Style controls - real-time updates
        document.getElementById('fontSelect').addEventListener('change', () => this.drawMeme());
        document.getElementById('fontSize').addEventListener('input', () => {
            this.updateRangeValues();
            this.drawMeme();
        });
        document.getElementById('textColor').addEventListener('input', () => this.drawMeme());
        document.getElementById('strokeColor').addEventListener('input', () => this.drawMeme());
        document.getElementById('strokeWidth').addEventListener('input', () => {
            this.updateRangeValues();
            this.drawMeme();
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Action buttons
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadMeme());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareMeme());
        document.getElementById('generateSuggestions').addEventListener('click', () => this.generateAISuggestions());

        // New event listener for the next meme button
        document.getElementById('nextMemeBtn').addEventListener('click', () => this.fetchRandomMeme());

        // New event listener for the random meme download button
        document.getElementById('downloadRandomMemeBtn').addEventListener('click', () => this.downloadRandomMeme());
    }

    updateRangeValues() {
        document.getElementById('sizeValue').textContent = document.getElementById('fontSize').value;
        document.getElementById('strokeValue').textContent = document.getElementById('strokeWidth').value;
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showMessageBox('Please select an image file', 'alert');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Clear template selection
            document.querySelectorAll('.template-item').forEach(t => t.classList.remove('active'));
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    loadImage(src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.currentImage = img;
            this.drawMeme();
        };
        img.onerror = () => {
            console.error('Failed to load image:', src);
            this.drawPlaceholder();
        };
        img.src = src;
    }

    drawPlaceholder() {
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Select a template or upload an image', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawMeme() {
        if (!this.currentImage) {
            this.drawPlaceholder();
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate image dimensions to fit canvas while maintaining aspect ratio
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.currentImage.width / this.currentImage.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imageAspect > canvasAspect) {
            // Image is wider than canvas
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imageAspect;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        } else {
            // Image is taller than canvas
            drawWidth = this.canvas.height * imageAspect;
            drawHeight = this.canvas.height;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        }
        
        // Draw image
        this.ctx.drawImage(this.currentImage, offsetX, offsetY, drawWidth, drawHeight);
        
        // Draw text
        this.drawText();
    }

    drawText() {
        this.textElements.forEach(element => {
            this.ctx.font = `${element.fontSize}px ${element.font}`;
            this.ctx.textAlign = 'center';
            this.ctx.lineWidth = element.strokeWidth;
            this.ctx.strokeStyle = element.strokeColor;
            this.ctx.fillStyle = element.color;

            const lines = this.wrapText(element.text, this.canvas.width - 20);
            let y = element.y;
            lines.forEach(line => {
                if (element.strokeWidth > 0) {
                    this.ctx.strokeText(line, element.x, y);
                }
                this.ctx.fillText(line, element.x, y);
                y += element.fontSize + 10;
            });
        });
    }

    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    async generateAISuggestions() {
        const btn = document.getElementById('generateSuggestions');
        const container = document.getElementById('suggestionsContainer');
        
        const API_TOKEN = "hf_your_token_here"; 
        const prompts = [
            "Generate funny meme captions about work and Monday morning struggles",
            "Create humorous top and bottom text for memes about programming and coding",
            "Write witty meme captions about everyday life expectations vs reality",
            "Generate relatable meme text about social media and internet culture",
            "Create funny captions for memes about procrastination and productivity"
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        btn.innerHTML = '<div class="loading"></div> Generating AI Captions...';
        btn.disabled = true;
        
        try {
            const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    inputs: randomPrompt,
                    parameters: {
                        max_length: 100,
                        temperature: 0.8,
                        do_sample: true,
                        top_p: 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            let suggestions = [];
            
            if (data && data[0]?.generated_text) {
                const aiText = data[0].generated_text;
                
                const sentences = aiText.split(/[.!?]+/).filter(s => s.trim().length > 3);
                
                for (let i = 0; i < Math.min(sentences.length - 1, 3); i++) {
                    suggestions.push({
                        top: sentences[i].trim(),
                        bottom: sentences[i + 1].trim()
                    });
                }
            }
            
            if (suggestions.length === 0) {
                suggestions = [
                    { top: 'When AI fails', bottom: 'But you still need memes' },
                    { top: 'Expectation: AI magic', bottom: 'Reality: Fallback text' },
                    { top: 'Me: Uses AI for memes', bottom: 'AI: Returns gibberish' }
                ];
            }
            
            const enhancedSuggestions = [
                ...suggestions,
                { top: 'When you realize', bottom: 'It\'s already Monday' },
                { top: 'Me trying to adult', bottom: 'vs Reality' },
                { top: 'My brain at 3 AM', bottom: 'Let\'s overthink everything' }
            ];
            
            container.innerHTML = '';
            enhancedSuggestions.slice(0, 4).forEach((suggestion, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <div><strong>Top:</strong> ${suggestion.top}</div>
                    <div><strong>Bottom:</strong> ${suggestion.bottom}</div>
                    <small style="opacity: 0.7;">${index === 0 ? '🤖 AI Generated' : '💡 Suggested'}</small>
                `;
                
                item.addEventListener('click', () => {
                    document.getElementById('topText').value = suggestion.top;
                    document.getElementById('bottomText').value = suggestion.bottom;
                    this.drawMeme();
                    item.classList.add('pulse');
                    setTimeout(() => item.classList.remove('pulse'), 1000);
                });
                
                container.appendChild(item);
            });
            
            container.style.display = 'grid';
            
        } catch (error) {
            console.error("AI generation failed:", error);
            
            const fallbackSuggestions = [
                { top: 'When AI is down', bottom: 'But memes must go on' },
                { top: 'API Error 404', bottom: 'Humor not found' },
                { top: 'Me: Tries AI memes', bottom: 'Internet: Nope' },
                { top: 'Expectation: AI magic', bottom: 'Reality: Manual memes' }
            ];
            
            container.innerHTML = '';
            fallbackSuggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <div><strong>Top:</strong> ${suggestion.top}</div>
                    <div><strong>Bottom:</strong> ${suggestion.bottom}</div>
                    <small style="opacity: 0.7;">📱 Offline Mode</small>
                `;
                
                item.addEventListener('click', () => {
                    document.getElementById('topText').value = suggestion.top;
                    document.getElementById('bottomText').value = suggestion.bottom;
                    this.drawMeme();
                    item.classList.add('pulse');
                    setTimeout(() => item.classList.remove('pulse'), 1000);
                });
                
                container.appendChild(item);
            });
            
            container.style.display = 'grid';
            this.showMessageBox("AI suggestions temporarily unavailable. Using fallback options!", 'alert');
        }
        
        btn.innerHTML = '<span>✨</span><span>Generate AI Suggestions</span>';
        btn.disabled = false;
    }

    async fetchRandomMeme() {
        const url = 'https://meme-api.com/gimme';
        const imgElement = document.getElementById('randomMemeImage');
        const nextBtn = document.getElementById('nextMemeBtn');

        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Loading...';
        imgElement.src = '';
        imgElement.alt = 'Loading random meme...';
        imgElement.style.opacity = '0.5';

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.url) {
                const newMeme = new Image();
                newMeme.onload = () => {
                    imgElement.src = newMeme.src;
                    imgElement.alt = data.title || 'Random Meme';
                    imgElement.style.opacity = '1';
                    nextBtn.disabled = false;
                    nextBtn.innerHTML = 'Next Meme';
                };
                newMeme.onerror = () => {
                    imgElement.src = 'https://placehold.co/600x400/CCCCCC/000000?text=Failed+to+load+meme';
                    imgElement.alt = 'Failed to load meme.';
                    imgElement.style.opacity = '1';
                    nextBtn.disabled = false;
                    nextBtn.innerHTML = 'Next Meme';
                    this.showMessageBox('Failed to load the meme. Please try again.', 'error');
                };
                newMeme.src = data.url;
            } else {
                imgElement.src = 'https://placehold.co/600x400/CCCCCC/000000?text=No+meme+found';
                imgElement.alt = 'No meme found.';
                imgElement.style.opacity = '1';
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Next Meme';
                this.showMessageBox('API returned no meme. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error fetching random meme:', error);
            imgElement.src = 'https://placehold.co/600x400/CCCCCC/000000?text=Network+Error';
            imgElement.alt = 'Network error.';
            imgElement.style.opacity = '1';
            nextBtn.disabled = false;
            nextBtn.innerHTML = 'Next Meme';
            this.showMessageBox('Network error. Could not fetch a random meme.', 'error');
        }
    }

    downloadRandomMeme() {
        const imgElement = document.getElementById('randomMemeImage');
        if (imgElement.src && !imgElement.src.includes('placehold.co')) {
            const link = document.createElement('a');
            link.href = imgElement.src;
            link.download = `random-meme-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showMessageBox('Meme downloaded!', 'success');
        } else {
            this.showMessageBox('No meme to download. Please generate one first.', 'info');
        }
    }

    downloadMeme() {
        if (!this.currentImage) {
            this.showMessageBox('Please select an image first', 'info');
            return;
        }

        const link = document.createElement('a');
        link.download = `meme-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    async shareMeme() {
        if (!this.currentImage) {
            this.showMessageBox('Please select an image first', 'info');
            return;
        }

        try {
            const canvas = this.canvas;
            canvas.toBlob(async (blob) => {
                const url = URL.createObjectURL(blob);
                const shareUrl = `${window.location.origin}${window.location.pathname}?meme=${encodeURIComponent(url)}`;
                
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Check out my meme!',
                            text: 'I created this awesome meme!',
                            url: shareUrl
                        });
                        return;
                    } catch (err) {
                        console.log('Native sharing failed, falling back to copy');
                    }
                }
                
                // Fallback to copying URL
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl);
                    this.showMessageBox('Share URL copied to clipboard!', 'success');
                }
                
                // Show the URL
                const shareUrlDiv = document.getElementById('shareUrl');
                shareUrlDiv.textContent = shareUrl;
                shareUrlDiv.style.display = 'block';
            });
        } catch (error) {
            console.error('Sharing failed:', error);
            this.showMessageBox('Sharing failed. Please try downloading the meme instead.', 'error');
        }
    }

    setupCanvasEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
    }

    addTextElement(text = '') {
        const textElement = {
            id: Date.now(),
            text: text,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            font: document.getElementById('fontSelect').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            color: document.getElementById('textColor').value,
            strokeColor: document.getElementById('strokeColor').value,
            strokeWidth: parseInt(document.getElementById('strokeWidth').value)
        };
        this.textElements.push(textElement);
        this.drawMeme();
        return textElement;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked on any text element
        for (let i = this.textElements.length - 1; i >= 0; i--) {
            const element = this.textElements[i];
            this.ctx.font = `${element.fontSize}px ${element.font}`;
            const metrics = this.ctx.measureText(element.text);
            const height = element.fontSize;

            if (x >= element.x - metrics.width/2 && 
                x <= element.x + metrics.width/2 && 
                y >= element.y - height && 
                y <= element.y) {
                this.draggedElement = element;
                this.dragOffset = {
                    x: x - element.x,
                    y: y - element.y
                };
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (this.draggedElement) {
            const rect = this.canvas.getBoundingClientRect();
            this.draggedElement.x = e.clientX - rect.left - this.dragOffset.x;
            this.draggedElement.y = e.clientY - rect.top - this.dragOffset.y;
            this.drawMeme();
        }
    }

    handleMouseUp() {
        this.draggedElement = null;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        for (let i = this.textElements.length - 1; i >= 0; i--) {
            const element = this.textElements[i];
            this.ctx.font = `${element.fontSize}px ${element.font}`;
            const metrics = this.ctx.measureText(element.text);
            const height = element.fontSize;

            if (x >= element.x - metrics.width/2 && 
                x <= element.x + metrics.width/2 && 
                y >= element.y - height && 
                y <= element.y) {
                this.draggedElement = element;
                this.dragOffset = {
                    x: x - element.x,
                    y: y - element.y
                };
                break;
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (this.draggedElement) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.draggedElement.x = touch.clientX - rect.left - this.dragOffset.x;
            this.draggedElement.y = touch.clientY - rect.top - this.dragOffset.y;
            this.drawMeme();
        }
    }

    handleTouchEnd() {
        this.draggedElement = null;
    }

    updateTextElementsList() {
        const list = document.getElementById('textElementsList');
        list.innerHTML = '';
        
        this.textElements.forEach((element, index) => {
            const item = document.createElement('div');
            item.className = 'text-element-item';
            item.innerHTML = `
                <div class="text-element-content">
                    <span>${element.text}</span>
                    <div class="text-element-styles">
                        <select class="style-select font-select" data-index="${index}">
                            <option value="Impact" ${element.font === 'Impact' ? 'selected' : ''}>Impact</option>
                            <option value="Arial" ${element.font === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Comic Sans MS" ${element.font === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans</option>
                            <option value="Verdana" ${element.font === 'Verdana' ? 'selected' : ''}>Verdana</option>
                        </select>
                        <div class="size-control">
                            <input type="range" class="style-select size-select" 
                                data-index="${index}" 
                                min="20" 
                                max="80" 
                                value="${element.fontSize}">
                            <span class="size-value">${element.fontSize}px</span>
                        </div>
                        <input type="color" class="style-select color-select" data-index="${index}" value="${element.color}">
                        <input type="color" class="style-select stroke-select" data-index="${index}" value="${element.strokeColor}">
                    </div>
                </div>
                <div class="text-element-controls">
                    <button class="btn-small edit-btn" data-index="${index}">✏️</button>
                    <button class="btn-small delete-btn" data-index="${index}">🗑️</button>
                </div>
            `;
            
            // Edit button
            item.querySelector('.edit-btn').addEventListener('click', () => {
                const newText = prompt('Edit text:', element.text);
                if (newText !== null) {
                    element.text = newText;
                    this.drawMeme();
                    this.updateTextElementsList();
                }
            });
            
            // Delete button
            item.querySelector('.delete-btn').addEventListener('click', () => {
                this.textElements.splice(index, 1);
                this.drawMeme();
                this.updateTextElementsList();
            });

            // Font change
            item.querySelector('.font-select').addEventListener('change', (e) => {
                const newFont = e.target.value;
                element.font = newFont;
                this.drawMeme();
            });

            // Size change
            const sizeInput = item.querySelector('.size-select');
            const sizeValue = item.querySelector('.size-value');
            sizeInput.addEventListener('input', (e) => {
                const newSize = parseInt(e.target.value);
                element.fontSize = newSize;
                sizeValue.textContent = `${newSize}px`;
                this.drawMeme();
            });

            // Text color change
            item.querySelector('.color-select').addEventListener('input', (e) => {
                const newColor = e.target.value;
                element.color = newColor;
                this.drawMeme();
            });

            // Stroke color change
            item.querySelector('.stroke-select').addEventListener('input', (e) => {
                const newStrokeColor = e.target.value;
                element.strokeColor = newStrokeColor;
                this.drawMeme();
            });
            
            list.appendChild(item);
        });
    }

    showMessageBox(message, type) {
        // A simple message box implementation to replace alert()
        const box = document.createElement('div');
        box.className = `message-box ${type}`;
        box.textContent = message;
        document.body.appendChild(box);
        setTimeout(() => {
            box.style.opacity = '0';
            setTimeout(() => box.remove(), 500);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemeGenerator();
});
