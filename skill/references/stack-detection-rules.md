# Stack Detection Rules

> Reference for **Phase 1 -- DISCOVER**.
> All rules are project-agnostic. They describe *what* to look for, *where* to look, and *how* to interpret findings.

---

## 1. Purpose

During Phase 1 the agent scans the repository to build a `stack_profile` object
that drives every subsequent phase. Detection must be:

- **Deterministic** -- the same repo always produces the same profile.
- **Non-destructive** -- no files are created, modified, or executed.
- **Fast** -- only file-existence checks, shallow reads, and regex scans.

The output feeds into template selection, toolchain wiring, and confidence
scoring (see `frd-confidence-scoring.md`).

---

## 2. Detection Priority and Conflict Resolution

### 2.1 Scan Order

Files are scanned in the following order. The first match in a category wins
unless the category explicitly allows multiple results.

| Priority | Category        | Allows Multiple? |
|----------|-----------------|------------------|
| 1        | Repo topology   | No               |
| 2        | Backend         | Yes -- ask user  |
| 3        | Frontend        | Yes -- ask user  |
| 4        | Database        | Yes              |
| 5        | Infrastructure  | Yes              |
| 6        | AI/ML layer     | Yes              |
| 7        | Auth layer      | Yes              |
| 8        | Migration tools | Yes              |

### 2.2 Multiple-Backend Conflict

When more than one backend is detected (e.g. `pyproject.toml` **and**
`package.json` both present at root), the agent MUST prompt the user:

```
Multiple backends detected: Python, Node.js
Which is the PRIMARY backend? (The other will be treated as secondary.)
```

The primary backend determines the default toolchain, test runner, and linter
configuration. Secondary backends still appear in the profile for reference.

---

## 3. Backend Detection

### 3.1 Python

#### Trigger Files

| File               | Path Pattern           | Confidence |
|--------------------|------------------------|------------|
| `pyproject.toml`   | `./pyproject.toml`     | High       |
| `requirements.txt` | `./requirements*.txt`  | High       |
| `setup.py`         | `./setup.py`           | High       |
| `setup.cfg`        | `./setup.cfg`          | Medium     |
| `Pipfile`          | `./Pipfile`            | High       |
| `poetry.lock`      | `./poetry.lock`        | High       |
| `uv.lock`          | `./uv.lock`            | High       |
| `conda.yaml`       | `./environment.yml`    | Medium     |

#### Version Extraction

| Source             | Field / Pattern                                                  |
|--------------------|------------------------------------------------------------------|
| `pyproject.toml`   | `[project].requires-python` -- e.g. `">=3.11"`                  |
| `setup.py`         | regex `python_requires\s*=\s*['"]([^'"]+)['"]`                  |
| `setup.cfg`        | `[options].python_requires`                                      |
| `Pipfile`          | `[requires].python_version`                                      |
| `.python-version`  | entire file content, trimmed                                     |
| `runtime.txt`      | regex `python-(\d+\.\d+(\.\d+)?)`                               |

#### Framework Detection

Scan dependency lists in `pyproject.toml` (`[project].dependencies`,
`[tool.poetry.dependencies]`), `requirements.txt`, `Pipfile`, or `setup.py`
`install_requires` for:

| Dependency Pattern          | Framework       | Notes                                      |
|-----------------------------|-----------------|--------------------------------------------|
| `fastapi`                   | FastAPI         | Check for `uvicorn` as companion           |
| `django`                    | Django          | Also check for `django-rest-framework`     |
| `flask`                     | Flask           | Check for `flask-restful`, `flask-restx`   |
| `starlette`                 | Starlette       | Standalone (not via FastAPI)               |
| `tornado`                   | Tornado         |                                            |
| `aiohttp`                   | aiohttp         |                                            |
| `sanic`                     | Sanic           |                                            |
| `litestar`                  | Litestar        | Formerly Starlite                          |
| `falcon`                    | Falcon          |                                            |
| `pyramid`                   | Pyramid         |                                            |

Regex for requirements files (handles extras and version pins):

```regex
^(fastapi|django|flask|starlette|tornado|aiohttp|sanic|litestar|falcon|pyramid)(\[.*\])?\s*(==|>=|~=|!=|<=|<|>)?
```

#### AI / ML Dependency Detection

| Dependency Pattern              | Category    |
|---------------------------------|-------------|
| `anthropic`                     | AI -- LLM   |
| `openai`                        | AI -- LLM   |
| `langchain` / `langchain-*`    | AI -- LLM   |
| `llama-index` / `llama_index`  | AI -- LLM   |
| `transformers`                  | AI -- ML    |
| `torch` / `pytorch`            | AI -- ML    |
| `tensorflow` / `tf-*`          | AI -- ML    |
| `scikit-learn` / `sklearn`     | AI -- ML    |
| `huggingface-hub`              | AI -- ML    |
| `sentence-transformers`        | AI -- ML    |

#### Key Dependency Flags

| Dependency          | Flag set in profile        |
|---------------------|----------------------------|
| `celery`            | `async_tasks: true`        |
| `dramatiq`          | `async_tasks: true`        |
| `redis` / `aioredis`| `cache: redis`            |
| `boto3`             | `cloud: aws`               |
| `google-cloud-*`   | `cloud: gcp`               |
| `azure-*`          | `cloud: azure`             |
| `pydantic`          | `validation: pydantic`     |
| `sqlalchemy`        | `orm: sqlalchemy`          |
| `tortoise-orm`      | `orm: tortoise`            |
| `sqlmodel`          | `orm: sqlmodel`            |

#### Default Toolchain

| Tool    | Purpose      | Config Detection                                          |
|---------|--------------|-----------------------------------------------------------|
| `ruff`  | Linter       | `[tool.ruff]` in `pyproject.toml`, `ruff.toml`, `.ruff.toml` |
| `mypy`  | Type checker | `[tool.mypy]` in `pyproject.toml`, `mypy.ini`, `.mypy.ini`, `setup.cfg` |
| `pytest`| Test runner  | `[tool.pytest]` in `pyproject.toml`, `pytest.ini`, `conftest.py` |
| `black` | Formatter    | `[tool.black]` in `pyproject.toml`, `pyproject.toml` presence |
| `isort` | Import sort  | `[tool.isort]` in `pyproject.toml`, `.isort.cfg`          |

If no linter config is detected, recommend `ruff` as default.

---

### 3.2 Node.js

#### Trigger Files

| File             | Path Pattern         | Confidence |
|------------------|----------------------|------------|
| `package.json`   | `./package.json`     | High       |
| `package-lock.json` | `./package-lock.json` | High   |
| `yarn.lock`      | `./yarn.lock`        | High       |
| `pnpm-lock.yaml` | `./pnpm-lock.yaml`  | High       |
| `bun.lockb`      | `./bun.lockb`        | High       |
| `.nvmrc`         | `./.nvmrc`           | Medium     |
| `.node-version`  | `./.node-version`    | Medium     |

#### Version Extraction

| Source           | Field / Pattern                                     |
|------------------|-----------------------------------------------------|
| `package.json`   | `engines.node` -- e.g. `">=18.0.0"`                |
| `.nvmrc`         | entire file content, trimmed                        |
| `.node-version`  | entire file content, trimmed                        |
| `.tool-versions` | regex `nodejs\s+(\S+)`                              |

#### Package Manager Detection

| Indicator                                  | Package Manager |
|--------------------------------------------|-----------------|
| `package-lock.json` present                | npm             |
| `yarn.lock` present                        | yarn            |
| `pnpm-lock.yaml` present                  | pnpm            |
| `bun.lockb` present                       | bun             |
| `package.json` `packageManager` field      | per value       |

Regex for `packageManager` field:

```regex
"packageManager"\s*:\s*"(npm|yarn|pnpm|bun)@[\d.]+"
```

#### Framework Detection

Scan `package.json` fields `dependencies` and `devDependencies` for:

| Dependency Pattern        | Framework       | Notes                              |
|---------------------------|-----------------|------------------------------------|
| `express`                 | Express         | Check for `@types/express`         |
| `@nestjs/core`            | NestJS          | TypeScript-native                  |
| `fastify`                 | Fastify         |                                    |
| `koa`                     | Koa             |                                    |
| `hapi` / `@hapi/hapi`    | Hapi            |                                    |
| `next`                    | Next.js         | Fullstack -- also sets frontend    |
| `nuxt`                    | Nuxt            | Fullstack -- also sets frontend    |
| `@remix-run/node`         | Remix           | Fullstack                          |
| `astro`                   | Astro           | Fullstack / static                 |
| `@sveltejs/kit`           | SvelteKit       | Fullstack                          |

#### TypeScript Detection

| Indicator                          | Result                      |
|------------------------------------|-----------------------------|
| `tsconfig.json` exists             | `typescript: true`          |
| `typescript` in `devDependencies`  | `typescript: true`          |
| `tsconfig.json` `compilerOptions.strict` | `typescript_strict: true/false` |

#### Default Toolchain

| Tool       | Purpose    | Config Detection                                           |
|------------|------------|------------------------------------------------------------|
| `eslint`   | Linter     | `.eslintrc.*`, `eslint.config.*`, `eslint` field in `package.json` |
| `prettier` | Formatter  | `.prettierrc.*`, `prettier` field in `package.json`        |
| `jest`     | Test runner| `jest.config.*`, `jest` field in `package.json`            |
| `vitest`   | Test runner| `vitest.config.*`, `vitest` in `devDependencies`           |
| `mocha`    | Test runner| `.mocharc.*`, `mocha` in `devDependencies`                 |
| `biome`    | Lint+Fmt   | `biome.json`, `biome.jsonc`, `@biomejs/biome` in deps     |

Test runner priority: vitest > jest > mocha (if multiple found, prefer first).

---

### 3.3 Go

#### Trigger Files

| File        | Path Pattern     | Confidence |
|-------------|------------------|------------|
| `go.mod`    | `./go.mod`       | High       |
| `go.sum`    | `./go.sum`       | High       |
| `go.work`   | `./go.work`      | Medium     |

#### Version Extraction

| Source    | Field / Pattern                          |
|-----------|------------------------------------------|
| `go.mod`  | regex `^go\s+(\d+\.\d+(\.\d+)?)`        |
| `go.work` | regex `^go\s+(\d+\.\d+(\.\d+)?)`        |

#### Framework Detection

Scan `go.mod` `require` block for:

| Module Path                          | Framework   |
|--------------------------------------|-------------|
| `github.com/gin-gonic/gin`          | Gin         |
| `github.com/labstack/echo`          | Echo        |
| `github.com/gofiber/fiber`          | Fiber       |
| `github.com/gorilla/mux`            | Gorilla Mux |
| `github.com/go-chi/chi`             | Chi         |
| `google.golang.org/grpc`            | gRPC        |
| `github.com/bufbuild/connect-go`    | Connect-Go  |
| `github.com/99designs/gqlgen`       | gqlgen      |

Regex to parse `go.mod` requires:

```regex
^\s+([\w./-]+)\s+v[\d.]+
```

#### Key Dependency Flags

| Module                                  | Flag                    |
|-----------------------------------------|-------------------------|
| `github.com/jmoiron/sqlx`              | `orm: sqlx`             |
| `gorm.io/gorm`                         | `orm: gorm`             |
| `entgo.io/ent`                          | `orm: ent`              |
| `github.com/aws/aws-sdk-go-v2`        | `cloud: aws`            |
| `cloud.google.com/go`                  | `cloud: gcp`            |
| `github.com/redis/go-redis`           | `cache: redis`          |
| `github.com/nats-io/nats.go`          | `messaging: nats`       |

#### Default Toolchain

| Tool            | Purpose    | Config Detection                              |
|-----------------|------------|-----------------------------------------------|
| `golangci-lint` | Linter     | `.golangci.yml`, `.golangci.yaml`, `.golangci.toml` |
| `gofmt`         | Formatter  | Built-in (always available)                   |
| `goimports`     | Imports    | Presence in tool deps                         |
| `go test`       | Test runner| Built-in (always available)                   |
| `gotestfmt`     | Test output| Presence in tool deps                         |

---

### 3.4 Java / Kotlin

#### Trigger Files

| File                  | Path Pattern               | Confidence |
|-----------------------|----------------------------|------------|
| `pom.xml`             | `./pom.xml`                | High       |
| `build.gradle`        | `./build.gradle`           | High       |
| `build.gradle.kts`    | `./build.gradle.kts`       | High       |
| `settings.gradle`     | `./settings.gradle`        | High       |
| `settings.gradle.kts` | `./settings.gradle.kts`    | High       |
| `mvnw`                | `./mvnw`                   | Medium     |
| `gradlew`             | `./gradlew`                | Medium     |

#### Build System Detection

| Indicator                 | Build System  |
|---------------------------|---------------|
| `pom.xml` present         | Maven         |
| `build.gradle` present    | Gradle        |
| `build.gradle.kts` present| Gradle (KTS)  |

#### Language Detection (Java vs Kotlin)

| Indicator                                               | Language |
|---------------------------------------------------------|----------|
| `src/main/java/` directory exists                       | Java     |
| `src/main/kotlin/` directory exists                     | Kotlin   |
| `build.gradle.kts` (Kotlin DSL)                        | Kotlin   |
| `kotlin` plugin in `build.gradle`                       | Kotlin   |
| regex `apply\s+plugin:\s*['"]kotlin['"]` in Gradle file | Kotlin   |

#### Version Extraction

| Source              | Field / Pattern                                        |
|---------------------|--------------------------------------------------------|
| `pom.xml`           | `<java.version>` or `<maven.compiler.source>`          |
| `build.gradle`      | regex `sourceCompatibility\s*=\s*['"]?(\d+)['"]?`     |
| `build.gradle.kts`  | regex `jvmTarget\.set\(["'](\d+)["']\)`               |
| `.java-version`     | entire file content, trimmed                           |
| `.sdkmanrc`         | regex `java=(\S+)`                                     |
| `.tool-versions`    | regex `java\s+(\S+)`                                   |

#### Framework Detection

**Maven** -- scan `pom.xml` for `<dependency>` elements:

| `groupId` / `artifactId` Pattern                  | Framework            |
|---------------------------------------------------|----------------------|
| `org.springframework.boot:spring-boot-starter-*`  | Spring Boot          |
| `io.quarkus:quarkus-*`                            | Quarkus              |
| `io.micronaut:micronaut-*`                        | Micronaut            |
| `io.dropwizard:dropwizard-*`                      | Dropwizard           |
| `io.vertx:vertx-*`                                | Vert.x               |
| `org.http4k:http4k-*`                             | http4k (Kotlin)      |
| `io.ktor:ktor-*`                                  | Ktor (Kotlin)        |

Regex for Maven dependency extraction:

```regex
<groupId>([\w.]+)</groupId>\s*<artifactId>([\w-]+)</artifactId>
```

**Gradle** -- scan `build.gradle` / `build.gradle.kts` for:

```regex
implementation\s*\(?\s*['"]([^'"]+)['"]
```

#### Default Toolchain

| Tool          | Purpose      | Config Detection                                    |
|---------------|--------------|-----------------------------------------------------|
| `checkstyle`  | Linter       | `checkstyle.xml`, `config/checkstyle/` dir          |
| `spotless`    | Formatter    | `spotless` plugin in Gradle config                  |
| `junit`       | Test runner  | `junit` in test dependencies                        |
| `jacoco`      | Coverage     | `jacoco` plugin in build config                     |
| `detekt`      | Kotlin lint  | `detekt.yml`, `detekt` plugin in Gradle             |
| `ktlint`      | Kotlin fmt   | `ktlint` plugin in Gradle                           |

---

### 3.5 C# / .NET

#### Trigger Files

| File             | Path Pattern              | Confidence |
|------------------|---------------------------|------------|
| `*.csproj`       | `./**/*.csproj`           | High       |
| `*.sln`          | `./*.sln`                 | High       |
| `*.fsproj`       | `./**/*.fsproj`           | High       |
| `global.json`    | `./global.json`           | High       |
| `Directory.Build.props` | `./Directory.Build.props` | Medium |
| `nuget.config`   | `./nuget.config`          | Medium     |

#### Version Extraction

| Source          | Field / Pattern                                                |
|-----------------|----------------------------------------------------------------|
| `global.json`   | `sdk.version` -- e.g. `"8.0.100"`                             |
| `*.csproj`      | `<TargetFramework>net8.0</TargetFramework>`                    |
| `*.csproj`      | regex `<TargetFramework>net(\d+\.\d+)</TargetFramework>`       |

#### Framework Detection

Scan `.csproj` files for `<PackageReference>` elements:

| `Include` Pattern                          | Framework             |
|--------------------------------------------|-----------------------|
| `Microsoft.AspNetCore.*`                   | ASP.NET Core          |
| `Microsoft.AspNetCore.Mvc`                 | ASP.NET Core MVC      |
| `Microsoft.AspNetCore.Components`          | Blazor                |
| `Swashbuckle.AspNetCore`                   | ASP.NET Core + Swagger|
| `Microsoft.Azure.Functions.*`              | Azure Functions       |
| `AWSSDK.*`                                 | AWS SDK               |

Regex for `.csproj` package references:

```regex
<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"
```

#### Project Style Detection

| Indicator                                        | Style         |
|--------------------------------------------------|---------------|
| `<Project Sdk="Microsoft.NET.Sdk.Web">`          | Web API       |
| `<Project Sdk="Microsoft.NET.Sdk.Worker">`       | Worker Service|
| `<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">` | Blazor WASM |
| `<OutputType>Exe</OutputType>`                   | Console app   |
| `<OutputType>Library</OutputType>`               | Class library |

#### Default Toolchain

| Tool              | Purpose    | Config Detection                             |
|-------------------|------------|----------------------------------------------|
| `dotnet format`   | Formatter  | `.editorconfig`, `stylecop.json`             |
| `xunit`           | Test runner| `xunit` in test `.csproj` PackageReferences  |
| `nunit`           | Test runner| `NUnit` in test `.csproj` PackageReferences  |
| `mstest`          | Test runner| `MSTest` in test `.csproj` PackageReferences |
| `coverlet`        | Coverage   | `coverlet.msbuild` in test `.csproj`         |
| `roslyn analyzers`| Linter     | `Microsoft.CodeAnalysis.*` in `.csproj`      |

---

### 3.6 Rust

#### Trigger Files

| File           | Path Pattern        | Confidence |
|----------------|---------------------|------------|
| `Cargo.toml`   | `./Cargo.toml`     | High       |
| `Cargo.lock`   | `./Cargo.lock`     | High       |
| `rust-toolchain.toml` | `./rust-toolchain.toml` | High |
| `rust-toolchain`| `./rust-toolchain` | High       |

#### Version Extraction

| Source                  | Field / Pattern                                      |
|-------------------------|------------------------------------------------------|
| `Cargo.toml`            | `[package].rust-version` -- e.g. `"1.75"`            |
| `Cargo.toml`            | `[package].edition` -- e.g. `"2021"`                 |
| `rust-toolchain.toml`   | `[toolchain].channel` -- e.g. `"1.75.0"`, `"stable"` |
| `rust-toolchain`        | entire file content, trimmed                         |

#### Framework Detection

Scan `Cargo.toml` `[dependencies]` for:

| Crate                  | Framework        | Notes                         |
|------------------------|------------------|-------------------------------|
| `actix-web`            | Actix Web        |                               |
| `axum`                 | Axum             | Tower ecosystem               |
| `rocket`               | Rocket           |                               |
| `warp`                 | Warp             |                               |
| `tide`                 | Tide             |                               |
| `poem`                 | Poem             |                               |
| `tonic`                | Tonic            | gRPC                          |
| `leptos`               | Leptos           | Fullstack / WASM              |
| `dioxus`               | Dioxus           | Fullstack / WASM              |
| `yew`                  | Yew              | WASM frontend                 |
| `tauri`                | Tauri            | Desktop app                   |

Regex to parse `Cargo.toml` dependencies:

```regex
^\s*([\w-]+)\s*=\s*(?:"([^"]+)"|{[^}]*version\s*=\s*"([^"]+)")
```

#### Key Dependency Flags

| Crate               | Flag                      |
|----------------------|---------------------------|
| `diesel`             | `orm: diesel`             |
| `sea-orm`            | `orm: sea-orm`            |
| `sqlx`               | `orm: sqlx`               |
| `tokio`              | `async_runtime: tokio`    |
| `async-std`          | `async_runtime: async-std`|
| `serde`              | `serialization: serde`    |
| `aws-sdk-*`          | `cloud: aws`              |

#### Default Toolchain

| Tool          | Purpose    | Config Detection                                |
|---------------|------------|-------------------------------------------------|
| `clippy`      | Linter     | Built-in component; `clippy.toml` for config    |
| `rustfmt`     | Formatter  | `rustfmt.toml`, `.rustfmt.toml`                 |
| `cargo test`  | Test runner| Built-in (always available)                     |
| `cargo-tarpaulin` | Coverage | Presence in dev-dependencies or CI config   |
| `cargo-nextest` | Test runner | `nextest` in dev-dependencies or `.config/nextest.toml` |

---

## 4. Frontend Detection

### 4.1 React

#### Trigger Files and Dependencies

| Indicator                          | Confidence |
|------------------------------------|------------|
| `react` in `package.json` deps    | High       |
| `react-dom` in `package.json` deps| High       |
| `next` in `package.json` deps     | High       |
| `jsx` or `tsx` files exist         | Medium     |

#### TypeScript Check

| Indicator                              | Result             |
|----------------------------------------|--------------------|
| `tsconfig.json` present               | `typescript: true`  |
| `.tsx` files present                   | `typescript: true`  |
| `"jsx": "react-jsx"` in tsconfig      | React + TypeScript  |

#### Build Tool Detection

| Indicator                              | Build Tool     |
|----------------------------------------|----------------|
| `vite.config.*` present               | Vite           |
| `@vitejs/plugin-react` in deps        | Vite           |
| `webpack.config.*` present            | Webpack        |
| `next.config.*` present               | Next.js        |
| `react-scripts` in deps               | Create React App |
| `@remix-run/react` in deps            | Remix          |
| `@tanstack/start` in deps             | TanStack Start |
| `rsbuild.config.*` present            | Rsbuild        |

#### Component Library Detection

Scan `package.json` `dependencies` and `devDependencies`:

| Dependency Pattern             | Library                |
|--------------------------------|------------------------|
| `antd`                         | Ant Design             |
| `@mui/material`                | Material UI (MUI)      |
| `@chakra-ui/react`             | Chakra UI              |
| `@mantine/core`                | Mantine                |
| `@radix-ui/*`                  | Radix UI               |
| `shadcn` (or `components.json`)| shadcn/ui              |
| `@headlessui/react`            | Headless UI            |
| `react-bootstrap`              | React Bootstrap        |
| `@nextui-org/react`            | NextUI                 |

#### State Management Detection

| Dependency Pattern                 | State Manager       |
|------------------------------------|---------------------|
| `redux` or `@reduxjs/toolkit`      | Redux               |
| `zustand`                          | Zustand             |
| `recoil`                           | Recoil              |
| `jotai`                            | Jotai               |
| `valtio`                           | Valtio              |
| `mobx`                             | MobX                |
| `@tanstack/react-query`            | TanStack Query      |
| `swr`                              | SWR                 |
| `xstate`                           | XState              |

#### CSS / Styling Detection

| Indicator                                        | Styling Approach        |
|--------------------------------------------------|-------------------------|
| `tailwindcss` in deps                            | Tailwind CSS            |
| `tailwind.config.*` present                      | Tailwind CSS            |
| `styled-components` in deps                      | Styled Components       |
| `@emotion/react` in deps                         | Emotion                 |
| `sass` or `node-sass` in deps                    | SCSS/Sass               |
| `*.module.css` files present                     | CSS Modules             |
| `*.module.scss` files present                    | CSS Modules + Sass      |
| `@vanilla-extract/css` in deps                   | Vanilla Extract         |
| `unocss` in deps                                 | UnoCSS                  |
| `postcss.config.*` present                       | PostCSS (generic)       |
| `@pandacss/dev` in deps                          | Panda CSS               |

---

### 4.2 Vue

#### Trigger Files and Dependencies

| Indicator                      | Confidence |
|--------------------------------|------------|
| `vue` in `package.json` deps  | High       |
| `.vue` files present           | High       |
| `nuxt` in `package.json` deps | High       |
| `nuxt.config.*` present       | High       |

#### Version Detection

| Source                            | Pattern                                |
|-----------------------------------|----------------------------------------|
| `package.json`                    | `"vue": "^3.*"` -- major version       |
| `package.json`                    | `"vue": "^2.*"` -- Vue 2 (legacy)     |
| Presence of `@vue/composition-api`| Vue 2 with Composition API backport    |

Regex:

```regex
"vue"\s*:\s*"[\^~]?(\d+)
```

#### State Management

| Dependency        | State Manager   | Vue Version |
|-------------------|-----------------|-------------|
| `pinia`           | Pinia           | 3 (or 2)   |
| `vuex`            | Vuex            | 2 or 3     |

#### Build Tool

| Indicator              | Build Tool   |
|------------------------|--------------|
| `vite.config.*`        | Vite         |
| `@vue/cli-service`     | Vue CLI      |
| `nuxt.config.*`        | Nuxt         |

#### Component Library Detection

| Dependency Pattern      | Library           |
|-------------------------|-------------------|
| `element-plus`          | Element Plus      |
| `vuetify`               | Vuetify           |
| `quasar`                | Quasar            |
| `naive-ui`              | Naive UI          |
| `primevue`              | PrimeVue          |
| `@arco-design/web-vue`  | Arco Design Vue   |

---

### 4.3 Angular

#### Trigger Files and Dependencies

| Indicator                           | Confidence |
|-------------------------------------|------------|
| `@angular/core` in `package.json`   | High       |
| `angular.json` present              | High       |
| `.angular-cli.json` present         | High       |

#### Version Extraction

| Source          | Pattern                                         |
|-----------------|-------------------------------------------------|
| `package.json`  | regex `"@angular/core"\s*:\s*"[\^~]?(\d+)`     |

#### State Management

| Dependency       | State Manager |
|------------------|---------------|
| `@ngrx/store`    | NgRx          |
| `@ngxs/store`    | NGXS          |
| `akita`          | Akita         |

#### Component Library Detection

| Dependency Pattern        | Library            |
|---------------------------|--------------------|
| `@angular/material`       | Angular Material   |
| `primeng`                 | PrimeNG            |
| `ng-zorro-antd`           | NG-ZORRO           |
| `@ng-bootstrap/ng-bootstrap` | ng-bootstrap   |

---

### 4.4 Svelte

#### Trigger Files and Dependencies

| Indicator                         | Confidence |
|-----------------------------------|------------|
| `svelte` in `package.json` deps  | High       |
| `.svelte` files present           | High       |
| `svelte.config.*` present         | High       |

#### SvelteKit Detection

| Indicator                           | Result        |
|-------------------------------------|---------------|
| `@sveltejs/kit` in deps            | SvelteKit     |
| `svelte.config.js` with adapter     | SvelteKit     |

#### Adapter Detection (SvelteKit)

| Dependency                        | Deploy Target    |
|-----------------------------------|------------------|
| `@sveltejs/adapter-auto`          | Auto             |
| `@sveltejs/adapter-node`          | Node server      |
| `@sveltejs/adapter-static`        | Static site      |
| `@sveltejs/adapter-vercel`        | Vercel           |
| `@sveltejs/adapter-netlify`       | Netlify          |
| `@sveltejs/adapter-cloudflare`    | Cloudflare       |

---

## 5. Database Detection

### 5.1 From ORM / Migration Configs

| Config File              | Database Tool   | Likely Database      |
|--------------------------|-----------------|----------------------|
| `alembic.ini`            | Alembic         | PostgreSQL (default) |
| `alembic/`               | Alembic         | PostgreSQL (default) |
| `prisma/schema.prisma`   | Prisma          | Read `datasource.provider` |
| `knexfile.js`            | Knex            | Read `client` field  |
| `knexfile.ts`            | Knex            | Read `client` field  |
| `ormconfig.json`         | TypeORM         | Read `type` field    |
| `typeorm.config.ts`      | TypeORM         | Read `type` field    |
| `drizzle.config.ts`      | Drizzle         | Read `dialect` field |
| `mikro-orm.config.ts`    | MikroORM        | Read `type` field    |
| `sequelize.config.js`    | Sequelize       | Read `dialect` field |
| `.sequelizerc`           | Sequelize       | Check config path    |
| `flyway.conf`            | Flyway          | Read `flyway.url`    |
| `liquibase.properties`   | Liquibase       | Read `url`           |
| `diesel.toml`            | Diesel          | Check `[print_schema]` |
| `refinery.toml`          | Refinery        | Rust migration tool  |

### 5.2 From Prisma Schema (specific parsing)

In `prisma/schema.prisma`, extract:

```regex
datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"
```

Possible values: `postgresql`, `mysql`, `sqlite`, `sqlserver`, `mongodb`, `cockroachdb`.

### 5.3 From Environment Variables

Scan `.env`, `.env.example`, `.env.local`, `.env.development` for:

| Pattern                                              | Database          |
|------------------------------------------------------|-------------------|
| `DATABASE_URL=postgres://` or `DATABASE_URL=postgresql://` | PostgreSQL  |
| `DATABASE_URL=mysql://`                              | MySQL             |
| `DATABASE_URL=mongodb://` or `DATABASE_URL=mongodb+srv://` | MongoDB    |
| `DATABASE_URL=sqlite:`                               | SQLite            |
| `DATABASE_URL=mssql://` or `DATABASE_URL=sqlserver://` | SQL Server      |
| `REDIS_URL=redis://`                                 | Redis             |
| `MONGO_URI=` or `MONGODB_URI=`                       | MongoDB           |
| `POSTGRES_*` (host/port/db/user)                     | PostgreSQL        |
| `MYSQL_*` (host/port/db/user)                        | MySQL             |

Regex for `DATABASE_URL` extraction:

```regex
DATABASE_URL\s*=\s*['"]?(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|sqlite|mssql|sqlserver)://
```

### 5.4 From Docker Compose

Scan `docker-compose.yml` / `docker-compose.yaml` / `compose.yml` / `compose.yaml` for service images:

| Image Pattern            | Database     |
|--------------------------|--------------|
| `postgres:*`             | PostgreSQL   |
| `mysql:*`                | MySQL        |
| `mariadb:*`              | MariaDB      |
| `mongo:*`                | MongoDB      |
| `redis:*`                | Redis        |
| `memcached:*`            | Memcached    |
| `minio/*`                | MinIO (S3)   |
| `elasticsearch:*`        | Elasticsearch|
| `opensearchproject/*`    | OpenSearch   |
| `cassandra:*`            | Cassandra    |
| `neo4j:*`                | Neo4j        |
| `clickhouse/*`           | ClickHouse   |
| `qdrant/qdrant`          | Qdrant       |
| `chromadb/chroma`        | ChromaDB     |
| `weaviate/*`             | Weaviate     |

Regex for image extraction from compose files:

```regex
image:\s*['"]?([\w./-]+):?
```

---

## 6. Infrastructure Detection

### 6.1 Docker

| File                     | Meaning                           |
|--------------------------|-----------------------------------|
| `Dockerfile`             | Docker build present              |
| `Dockerfile.*`           | Multi-stage or variant builds     |
| `.dockerignore`          | Docker build present              |
| `docker-compose.yml`     | Compose orchestration             |
| `docker-compose.yaml`    | Compose orchestration             |
| `compose.yml`            | Compose orchestration (v2 naming) |
| `compose.yaml`           | Compose orchestration (v2 naming) |
| `docker-compose.*.yml`   | Environment-specific compose      |

### 6.2 CI/CD Detection

| File / Directory                        | CI System        |
|-----------------------------------------|------------------|
| `.github/workflows/*.yml`               | GitHub Actions   |
| `.github/workflows/*.yaml`              | GitHub Actions   |
| `.gitlab-ci.yml`                        | GitLab CI        |
| `Jenkinsfile`                           | Jenkins          |
| `.circleci/config.yml`                  | CircleCI         |
| `.travis.yml`                           | Travis CI        |
| `bitbucket-pipelines.yml`              | Bitbucket Pipelines |
| `azure-pipelines.yml`                   | Azure DevOps     |
| `.buildkite/pipeline.yml`              | Buildkite        |
| `appveyor.yml`                          | AppVeyor         |
| `.drone.yml`                            | Drone CI         |
| `.woodpecker.yml`                       | Woodpecker CI    |
| `cloudbuild.yaml`                       | Google Cloud Build |
| `.tekton/*.yaml`                        | Tekton           |
| `.harness/*.yaml`                       | Harness CI       |

### 6.3 Deploy Target Detection

| Indicator                              | Deploy Target         |
|----------------------------------------|-----------------------|
| `vercel.json`                          | Vercel                |
| `.vercel/` directory                   | Vercel                |
| `netlify.toml`                         | Netlify               |
| `_redirects` or `_headers` in `public/`| Netlify               |
| `fly.toml`                             | Fly.io                |
| `render.yaml`                          | Render                |
| `railway.toml` or `railway.json`       | Railway               |
| `app.yaml` or `app.yml`               | Google App Engine     |
| `serverless.yml` / `serverless.ts`     | Serverless Framework  |
| `sam-template.yaml` or `template.yaml` | AWS SAM               |
| `cdk.json`                             | AWS CDK               |
| `pulumi.yaml` or `Pulumi.yaml`         | Pulumi                |
| `terraform/*.tf`                       | Terraform             |
| `*.tf` at root                         | Terraform             |
| `k8s/` or `kubernetes/` directory      | Kubernetes            |
| `kustomization.yaml`                   | Kubernetes (Kustomize)|
| `helm/` directory or `Chart.yaml`      | Kubernetes (Helm)     |
| `skaffold.yaml`                        | Skaffold              |
| `.platform.app.yaml`                   | Platform.sh           |
| `Procfile`                             | Heroku / Dokku        |
| `nixpacks.toml`                        | Nixpacks (Railway)    |
| `deno.json`                            | Deno Deploy           |
| `wrangler.toml`                        | Cloudflare Workers    |
| `amplify.yml`                          | AWS Amplify           |
| `firebase.json`                        | Firebase              |
| `supabase/config.toml`                 | Supabase              |

---

## 7. Repo Topology Detection

### 7.1 Classification

| Topology    | Detection Rule                                                   |
|-------------|------------------------------------------------------------------|
| Single-repo | Exactly one backend, one frontend (or none), no workspace config |
| Monorepo    | Workspace config file present (see below)                        |
| Multi-repo  | `.git` directories in subdirectories (submodules or nested repos)|

### 7.2 Monorepo Indicators

| File                   | Tool           | Parse Rule                                 |
|------------------------|----------------|--------------------------------------------|
| `turbo.json`           | Turborepo      | Read `pipeline` keys for task topology     |
| `lerna.json`           | Lerna          | Read `packages` array for workspace globs  |
| `pnpm-workspace.yaml`  | pnpm workspaces| Read `packages` array                      |
| `nx.json`              | Nx             | Read `projects` or detect `project.json` files |
| `rush.json`            | Rush           | Read `projects` array                      |
| `package.json` `workspaces` | npm/yarn workspaces | Read `workspaces` array or `workspaces.packages` |
| `Cargo.toml` `[workspace]` | Cargo workspace | Read `members` array                  |
| `go.work`              | Go workspaces  | Read `use` directives                      |
| `settings.gradle`      | Gradle multi-project | `include` directives                  |
| `pom.xml` `<modules>`  | Maven multi-module | `<module>` elements                    |

### 7.3 Workspace Package Discovery

For monorepos, resolve workspace globs to find all packages:

```
packages/*, apps/*, libs/*   ->   list directories matching these globs
```

Each package should be scanned independently for its own backend/frontend
detection using the same rules in sections 3 and 4.

---

## 8. AI/ML Layer Detection

### 8.1 Dependency-Based

Flag `ai_ml_layer: true` if ANY of these dependencies are found in any
package across the repo:

| Language   | Dependencies                                                              |
|------------|---------------------------------------------------------------------------|
| Python     | `anthropic`, `openai`, `langchain`, `llama-index`, `transformers`, `torch`, `tensorflow`, `huggingface-hub`, `sentence-transformers`, `chromadb`, `pinecone-client`, `weaviate-client`, `qdrant-client`, `cohere`, `google-generativeai`, `replicate`, `together`, `mistralai`, `groq`, `ollama` |
| Node.js    | `@anthropic-ai/sdk`, `openai`, `langchain`, `@langchain/*`, `llamaindex`, `@huggingface/inference`, `@pinecone-database/pinecone`, `cohere-ai`, `@google/generative-ai`, `@mistralai/mistralai`, `groq-sdk`, `ollama-ai-provider`, `ai` (Vercel AI SDK) |
| Go         | `github.com/sashabaranov/go-openai`, `github.com/tmc/langchaingo`, `github.com/liushuangls/go-anthropic` |
| Rust       | `async-openai`, `anthropic-sdk`, `llm-chain`                             |
| Java       | `com.theokanning.openai-gpt3-java:*`, `dev.langchain4j:*`               |
| C#         | `Anthropic`, `OpenAI`, `Microsoft.SemanticKernel`                        |

### 8.2 Environment Variable-Based

Scan `.env`, `.env.example`, `.env.local` for:

| Variable Pattern            | AI Provider     |
|-----------------------------|-----------------|
| `ANTHROPIC_API_KEY`         | Anthropic       |
| `OPENAI_API_KEY`            | OpenAI          |
| `GOOGLE_API_KEY`            | Google AI       |
| `COHERE_API_KEY`            | Cohere          |
| `HUGGINGFACE_TOKEN`         | Hugging Face    |
| `PINECONE_API_KEY`          | Pinecone        |
| `REPLICATE_API_TOKEN`       | Replicate       |
| `TOGETHER_API_KEY`          | Together AI     |
| `MISTRAL_API_KEY`           | Mistral         |
| `GROQ_API_KEY`              | Groq            |

### 8.3 Directory-Based

| Directory Pattern           | Meaning                          |
|-----------------------------|----------------------------------|
| `models/` or `ml/`         | Custom ML models                 |
| `notebooks/` or `*.ipynb`  | Jupyter notebooks (ML/data)      |
| `prompts/` or `templates/` | LLM prompt templates             |
| `agents/`                  | AI agent definitions             |
| `rag/` or `retrieval/`     | RAG pipeline                     |
| `embeddings/`              | Embedding pipeline               |
| `fine-tuning/` or `training/` | Model training                |

---

## 9. Auth Layer Detection

### 9.1 Directory-Based

Flag `auth_layer: true` if any of these directories exist:

| Directory Pattern                               |
|-------------------------------------------------|
| `auth/`, `authentication/`, `authorization/`    |
| `src/auth/`, `app/auth/`, `lib/auth/`           |
| `src/modules/auth/`, `src/features/auth/`       |
| `iam/`, `identity/`, `sso/`                     |

### 9.2 Dependency-Based

| Language | Dependency                        | Auth Type           |
|----------|-----------------------------------|---------------------|
| Python   | `python-jose`                     | JWT                 |
| Python   | `PyJWT`                           | JWT                 |
| Python   | `passlib`                         | Password hashing    |
| Python   | `bcrypt`                          | Password hashing    |
| Python   | `pyotp`                           | TOTP / MFA          |
| Python   | `authlib`                         | OAuth               |
| Python   | `python-social-auth`              | Social login        |
| Python   | `django-allauth`                  | Django auth         |
| Python   | `django-rest-framework-simplejwt` | Django JWT          |
| Python   | `fastapi-users`                   | FastAPI auth        |
| Node.js  | `passport`                        | Auth middleware      |
| Node.js  | `jsonwebtoken`                    | JWT                 |
| Node.js  | `bcryptjs` or `bcrypt`            | Password hashing    |
| Node.js  | `@auth/core` or `next-auth`       | NextAuth.js         |
| Node.js  | `@clerk/nextjs`                   | Clerk               |
| Node.js  | `@supabase/auth-helpers-*`        | Supabase Auth       |
| Node.js  | `firebase-admin`                  | Firebase Auth       |
| Node.js  | `@auth0/nextjs-auth0`             | Auth0               |
| Node.js  | `lucia`                           | Lucia Auth          |
| Node.js  | `arctic`                          | OAuth 2.0           |
| Go       | `github.com/golang-jwt/jwt`       | JWT                 |
| Go       | `github.com/coreos/go-oidc`       | OIDC                |
| Go       | `golang.org/x/oauth2`             | OAuth 2.0           |
| Rust     | `jsonwebtoken`                    | JWT                 |
| Rust     | `oauth2`                          | OAuth 2.0           |
| Java     | `spring-boot-starter-security`    | Spring Security     |
| Java     | `io.jsonwebtoken:jjwt-*`          | JWT                 |
| C#       | `Microsoft.AspNetCore.Authentication.*` | ASP.NET Auth  |
| C#       | `Microsoft.Identity.Web`          | MS Identity         |

### 9.3 Configuration-Based

| File / Pattern                         | Auth System       |
|----------------------------------------|-------------------|
| `keycloak.json`                        | Keycloak          |
| `.auth0` directory or `auth0` in deps  | Auth0             |
| `firebase.json` with `auth` rules     | Firebase Auth     |
| `supabase/config.toml` with `[auth]`  | Supabase Auth     |
| `AWS_COGNITO_*` in `.env`             | AWS Cognito       |
| `OKTA_*` in `.env`                    | Okta              |

---

## 10. Migration Tool Detection

### 10.1 Config-to-Tool Mapping

| Config File / Pattern             | Migration Tool  | Language   | Typical DB       |
|-----------------------------------|-----------------|------------|------------------|
| `alembic.ini`                     | Alembic         | Python     | PostgreSQL/MySQL |
| `alembic/` directory              | Alembic         | Python     | PostgreSQL/MySQL |
| `prisma/schema.prisma`            | Prisma Migrate  | Node.js    | Per provider     |
| `knexfile.js` / `knexfile.ts`     | Knex Migrate    | Node.js    | Per client       |
| `migrations/` with `.sql` files   | Raw SQL         | Any        | Any              |
| `db/migrate/` directory           | Rails Migrate   | Ruby       | Per config       |
| `flyway.conf`                     | Flyway          | Java/.NET  | Per URL          |
| `flyway/` directory               | Flyway          | Java/.NET  | Per URL          |
| `liquibase.properties`            | Liquibase       | Java       | Per URL          |
| `changelog.xml` / `changelog.yaml`| Liquibase       | Java       | Per URL          |
| `diesel.toml`                     | Diesel CLI      | Rust       | Per config       |
| `refinery.toml`                   | Refinery        | Rust       | Per config       |
| `atlas.hcl`                       | Atlas           | Go         | Per config       |
| `goose` in deps / `dbconfig.yml`  | Goose           | Go         | Per config       |
| `migrate` CLI or `golang-migrate` | golang-migrate  | Go         | Per config       |
| `drizzle.config.ts`               | Drizzle Kit     | Node.js    | Per dialect      |
| `typeorm` migration config        | TypeORM         | Node.js    | Per type         |
| `mikro-orm.config.ts`             | MikroORM        | Node.js    | Per type         |
| `sequelize` config + `migrations/`| Sequelize CLI   | Node.js    | Per dialect      |
| `hasura/` directory               | Hasura Migrate  | Any        | PostgreSQL       |
| `supabase/migrations/`            | Supabase CLI    | Any        | PostgreSQL       |
| `sqitch.plan`                     | Sqitch          | Any        | Per config       |
| `dbmate` in scripts or deps       | dbmate          | Any        | Per URL          |

### 10.2 Migration Directory Conventions

When a migration tool is detected, look for the migration directory:

| Tool           | Default Directory                                      |
|----------------|--------------------------------------------------------|
| Alembic        | `alembic/versions/`                                    |
| Prisma         | `prisma/migrations/`                                   |
| Knex           | `migrations/`                                          |
| Drizzle        | `drizzle/`                                             |
| TypeORM        | `src/migrations/` or `migrations/`                     |
| Sequelize      | `db/migrations/` or `migrations/`                      |
| Flyway         | `sql/` or `db/migration/` or `flyway/sql/`             |
| Liquibase      | `db/changelog/`                                        |
| Diesel         | `migrations/`                                          |
| golang-migrate | `migrations/` or `db/migrations/`                      |
| Goose          | `db/migrations/` or `migrations/`                      |
| Rails          | `db/migrate/`                                          |
| Django         | `<app>/migrations/`                                    |

---

## Appendix A: Profile Schema Summary

The final `stack_profile` object produced by detection should contain:

```
stack_profile:
  topology: single-repo | monorepo | multi-repo
  monorepo_tool: turborepo | lerna | nx | pnpm | rush | cargo | go | null
  backends:
    - language: python | node | go | java | kotlin | csharp | rust
      version: string
      framework: string
      build_system: string | null
      package_manager: string
      orm: string | null
      toolchain:
        linter: string
        formatter: string
        test_runner: string
        type_checker: string | null
  frontends:
    - framework: react | vue | angular | svelte
      typescript: boolean
      build_tool: string
      component_lib: string | null
      state_mgmt: string | null
      css_approach: string | null
  databases:
    - type: postgresql | mysql | mongodb | redis | sqlite | ...
      detected_via: orm | env | docker
  infrastructure:
    docker: boolean
    ci: string[]
    deploy_targets: string[]
    iac: string[]
  ai_ml_layer:
    detected: boolean
    providers: string[]
    frameworks: string[]
  auth_layer:
    detected: boolean
    type: string[]
    provider: string | null
  migration_tools:
    - tool: string
      config_file: string
      directory: string
```

---

## Appendix B: File Scanning Safeguards

1. **Never read `.env` files that are not example files** in production repos.
   Prefer `.env.example`, `.env.sample`, `.env.template`. Fall back to `.env`
   only if no example variant exists, and NEVER log or store actual secret
   values -- only key names.

2. **Limit directory traversal depth** to 3 levels for glob-based searches
   (e.g. `*.csproj`). Monorepo workspace resolution may go deeper but must
   follow explicit workspace globs only.

3. **Skip `node_modules/`, `vendor/`, `target/`, `build/`, `dist/`, `.git/`,
   `__pycache__/`, `.venv/`, `venv/`** directories during all scans.

4. **File size guard**: do not read files larger than 1 MB for detection
   purposes. Trigger files (`package.json`, `go.mod`, etc.) are almost always
   small, but lock files (`yarn.lock`, `Cargo.lock`) can be large and should
   only be checked for existence, not parsed.
