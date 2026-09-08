# Cam Test

React Three Fiber ile olusturulan, resim veya webcam girdisini 64x64 instanced cam panel mozaigine donusturen Vite uygulamasi.

## Lokal gelistirme

```bash
npm ci
npm run dev
```

Uretim derlemesini kontrol etmek icin:

```bash
npm run lint
npm run build
```

## GitHub Actions ve GHCR

`.github/workflows/container.yml`, `main` dalina gelen her push'ta multi-platform Docker imajini su adreslere yollar:

- `ghcr.io/<github-owner>/<repo>:latest`
- `ghcr.io/<github-owner>/<repo>:main`
- `ghcr.io/<github-owner>/<repo>:sha-<commit>`

`v1.2.3` gibi bir tag push edilirse semver tag'leri de uretilir. Pull request'lerde imaj sadece build edilir, registry'ye gonderilmez. Workflow, GitHub'in otomatik `GITHUB_TOKEN` degeriyle calisir; ek bir registry secret'i gerekmez.

## Sunucuya kurulum

Gereksinimler:

- Alan adinin A/AAAA kaydi sunucuya yonlendirilmis olmali.
- Sunucunun 80 ve 443 portlari acik olmali.
- Docker Engine ve Docker Compose plugin kurulu olmali.

Dosyalari sunucuya kopyaladiktan sonra ortam dosyasini olusturun:

```bash
cp .env.example .env
```

`.env` icinde en az `IMAGE_NAME`, `APP_HOST` ve `ACME_EMAIL` alanlarini gercek degerlerle degistirin. Ardindan:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Traefik HTTP isteklerini HTTPS'e yonlendirir ve Let's Encrypt sertifikasini otomatik alir. HTTPS, tarayicida webcam erisimi icin de gereklidir.

Watchtower varsayilan olarak her 300 saniyede bir registry'yi kontrol eder. Yalnizca `app` servisi Watchtower etiketi tasidigi icin Traefik ve Watchtower otomatik olarak degistirilmez.

### Private GHCR imaji

GHCR package public ise sunucuda giris gerekmez. Private ise once `read:packages` yetkili bir GitHub personal access token ile giris yapin:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u GITHUB_KULLANICI_ADI --password-stdin
```

Watchtower, Docker kimlik bilgilerini `DOCKER_CONFIG_DIR` altindan okur. Compose'u root disinda calistiriyorsaniz `.env` icindeki bu degeri ornegin `/home/deploy/.docker` olarak degistirin.

> Not: Watchtower projesi arsivlenmistir. Compose'taki `DOCKER_API_VERSION=1.44`, yeni Docker Engine surumleriyle bilinen API uyumsuzlugu icin eklenmistir.
