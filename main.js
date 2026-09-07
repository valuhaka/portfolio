const currentLang = localStorage.getItem('siteLang') || 'en';

document.addEventListener("DOMContentLoaded", () => {
    fetch('/header.html')
        .then(response => response.text())
        .then(html => {
            const header = document.getElementById('main-header');
            if (header) {
                header.innerHTML = html;
                initHeaderLogic();
            }
        })
        .catch(err => console.error(err));

    const portfolioContainer = document.getElementById('portfolio-container');
    const projectContainer = document.getElementById('project-container');

    if (portfolioContainer) {
        loadPortfolio(portfolioContainer);
    } else if (projectContainer) {
        loadProject(projectContainer);
    }
});

function initHeaderLogic() {
    const body = document.body;

    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('night-mode');
            if (body.classList.contains('night-mode')) {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            } else {
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'none';
            }
        });
    }

    const langToggle = document.getElementById('lang-toggle');
    const langText = document.getElementById('lang-text');

    if (langToggle && langText) {
        langText.textContent = currentLang === 'en' ? 'FI' : 'EN';

        langToggle.addEventListener('click', () => {
            const newLang = currentLang === 'en' ? 'fi' : 'en';
            localStorage.setItem('siteLang', newLang);
            location.reload();
        });
    }
}

function parseMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    return html;
}

function createCard(data) {
    if (!data) return null;

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';

    if (data.title) {
        const h2 = document.createElement('h2');
        const mainLink = document.createElement('a');
        mainLink.href = data.url || '#';
        mainLink.className = 'card-main-link';
        mainLink.textContent = data.title;
        h2.appendChild(mainLink);
        cardDiv.appendChild(h2);
    }

    if (data.description) {
        const p = document.createElement('p');
        p.innerHTML = parseMarkdown(data.description);
        cardDiv.appendChild(p);
    }

    let imageUrl = data.image;

    if (!imageUrl && data.url && data.url.startsWith('http')) {
        const fallbackCount = 5;
        const dataLength = JSON.stringify(data).length;
        const fallbackIndex = (dataLength % fallbackCount) + 1;
        imageUrl = `/fallback-images/${fallbackIndex}.jpg`;
    }

    if (imageUrl) {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'img-wrapper';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = data.title ? data.title + ' preview' : 'Preview image';

        img.onload = () => {
            if (img.naturalHeight > img.naturalWidth) {
                imgWrapper.classList.add('tall-image');
            }
        };

        imgWrapper.appendChild(img);
        cardDiv.appendChild(imgWrapper);
    }

    if (data.date || (data.hashtags && Array.isArray(data.hashtags))) {
        const footerDiv = document.createElement('div');
        footerDiv.className = 'card-footer';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'card-date';
        if (data.date) dateSpan.textContent = data.date;
        footerDiv.appendChild(dateSpan);

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'card-hashtags';

        if (Array.isArray(data.hashtags)) {
            data.hashtags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'hashtag';
                tagSpan.textContent = '#' + tag;
                tagsDiv.appendChild(tagSpan);
            });
        }
        footerDiv.appendChild(tagsDiv);
        cardDiv.appendChild(footerDiv);
    }

    return cardDiv;
}

function loadPortfolio(container) {
    fetch('/projects.yaml')
        .then(response => response.text())
        .then(yamlText => {
            const folders = jsyaml.load(yamlText);

            const cardFetches = folders.map(folder => {
                const primaryUrl = `/${folder}/data-${currentLang}.yaml`;
                const fallbackUrl = `/${folder}/data-en.yaml`;

                return fetch(primaryUrl)
                    .then(res => {
                        if (res.ok) return res.text();
                        if (currentLang !== 'en') {
                            return fetch(fallbackUrl).then(r => r.ok ? r.text() : null);
                        }
                        return null;
                    })
                    .then(text => {
                        if (!text) return null;
                        const fullData = jsyaml.load(text);
                        const cardData = fullData.card;
                        if (cardData && !cardData.url) {
                            cardData.url = `/${folder}/`;
                        }
                        return cardData;
                    })
                    .catch(() => null);
            });

            Promise.all(cardFetches).then(cardsData => {
                cardsData.forEach(card => {
                    if (card) container.appendChild(createCard(card));
                });
            });
        });
}

function loadProject(container) {
    const primaryUrl = `data-${currentLang}.yaml`;
    const fallbackUrl = `data-en.yaml`;

    fetch(primaryUrl)
        .then(res => {
            if (res.ok) return res.text();
            if (currentLang !== 'en') {
                return fetch(fallbackUrl).then(r => r.ok ? r.text() : null);
            }
            return null;
        })
        .then(text => {
            if (!text) return;

            const data = jsyaml.load(text);
            const cardData = data.card;

            const article = document.createElement('article');
            article.className = 'project-article';

            if (cardData.image) {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'img-wrapper';

                const img = document.createElement('img');
                img.src = cardData.image;
                img.alt = cardData.title;
                img.className = 'project-hero-image';

                img.onload = () => {
                    if (img.naturalHeight > img.naturalWidth) {
                        imgWrapper.classList.add('tall-image');
                    }
                };

                imgWrapper.appendChild(img);
                article.appendChild(imgWrapper);
            }

            if (cardData.title) {
                const h1 = document.createElement('h1');
                h1.textContent = cardData.title;
                article.appendChild(h1);
                document.title = cardData.title;
            }

            if (cardData.date || (cardData.hashtags && cardData.hashtags.length > 0)) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'project-meta';

                const dateSpan = document.createElement('span');
                dateSpan.className = 'card-date';
                if (cardData.date) dateSpan.textContent = cardData.date;
                metaDiv.appendChild(dateSpan);

                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'card-hashtags';
                if (cardData.hashtags) {
                    cardData.hashtags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'hashtag';
                        tagSpan.textContent = '#' + tag;
                        tagsDiv.appendChild(tagSpan);
                    });
                }
                metaDiv.appendChild(tagsDiv);
                article.appendChild(metaDiv);
            }

            if (data.body && Array.isArray(data.body)) {
                data.body.forEach(paragraphText => {
                    const p = document.createElement('p');
                    p.innerHTML = parseMarkdown(paragraphText);
                    article.appendChild(p);
                });
            }

            container.appendChild(article);

            if (data.content && typeof data.content === 'object') {
                Object.values(data.content).forEach(itemData => {
                    if (itemData) {
                        container.appendChild(createCard(itemData));
                    }
                });
            }
        });
}