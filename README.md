# ar-teste — Surpresa de Natal em realidade aumentada

Aponte o celular para o porta-copos: abre um buraco preto, o Papai Noel joga o saco de presentes para fora,
dispara um arpão, é puxado pelo cabo, solta, dá um mortal e aparece **FELIZ NATAL**.

- Página: https://nbf1985.github.io/ar-teste/
- Porta-copos (para abrir na tela): https://nbf1985.github.io/ar-teste/porta-copos.png
- Porta-copos para imprimir (A4, 10 cm): https://nbf1985.github.io/ar-teste/porta-copos-imprimir-A4.pdf

## Arquivos
- `index.html` — liga a câmera, reconhece o porta-copos e chama a cena
- `natal.js` — a cena inteira (buraco, Papai Noel, saco, arpão, texto, neve) e o roteiro de tempos (`T`)
- `assets/porta-copos.mind` — o porta-copos "compilado" para o reconhecimento de imagem
- `porta-copos.png` — arte do porta-copos (provisória)

## Ajuste de tremor
Dá para testar valores pelo link, sem mexer no código: `?cf=0.0005&beta=0.01` (padrão).
`cf` menor = mais estável e um pouco mais lento; `beta` maior = acompanha mais rápido quando o celular mexe.

Tecnologia open source: [MindAR](https://github.com/hiukim/mind-ar-js) 1.2.5 + [Three.js](https://threejs.org) 0.160.0.
