# Dehj

## Objetivo atual (MVP offline)
Ter **somente**:
1. um quarto isométrico;
2. um personagem visível dentro do quarto;
3. movimentação básica por clique/toque.

Sem login, catálogo, inventário, moedas, chat, multiplayer, backend ou persistência.

## Diagnóstico do projeto atual
O projeto já está próximo do objetivo:
- `index.html` carrega duas telas (boas-vindas e jogo) e inclui Phaser por CDN.
- `game.js` desenha quarto isométrico, posiciona sprite do personagem e move por clique.
- `style.css` estiliza UI e layout full-screen.
- Assets locais usados: `personagem.png` e a imagem de fundo da tela inicial.

## O que ainda é necessário para “funcionar redondo” nesse escopo

### 1) Definir modo offline real
Atualmente o Phaser vem de CDN (`jsdelivr`). Sem internet, o jogo não abre.

Para offline real:
- baixar `phaser.min.js` para o repositório;
- referenciar arquivo local no `index.html`.

### 2) Executar por servidor local
Abrir o HTML direto por `file://` pode causar problemas de input/assets em alguns navegadores.

Rodar com servidor simples, por exemplo:
- `python -m http.server 8000`
- acessar `http://localhost:8000`

### 3) Ajustar responsividade do canvas
O `game.js` usa `window.innerWidth/innerHeight` na inicialização, mas não trata `resize`.

Recomendado:
- adicionar listener de `resize` para atualizar tamanho do Phaser;
- recalcular origem do quarto após rotação (tablet/celular).

### 4) Limpar UI para foco total no quarto+personagem
Como o objetivo é mínimo, pode remover elementos não essenciais:
- botões/áreas de ação extras;
- comentários e estilos legados não usados.

### 5) Validar sprite sheet
A lógica usa recorte manual (`setCrop`) com dimensões fixas (`102x153`).

Recomendado:
- confirmar dimensões reais da sprite sheet;
- padronizar quantidade de frames por animação;
- manter pelo menos `idle` e `walk` estáveis.

## Critérios de aceite (prontos para validar)
- Ao abrir o jogo: aparece a tela inicial.
- Ao clicar em “Entrar”: aparece o quarto.
- O personagem aparece inteiro, com pé no chão isométrico.
- Clique/toque dentro do quarto move personagem até o tile.
- Sem qualquer funcionalidade extra além disso.

## Estrutura atual
- `index.html` — estrutura das telas e carregamento de scripts.
- `style.css` — visual das telas.
- `game.js` — lógica do quarto, personagem e movimento.
- `personagem.png` — sprite do avatar.
- `file_0000000050d8720aa1843d19feadc580.png` — fundo da tela inicial.
