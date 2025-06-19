<div id="top">

<!-- HEADER STYLE: CLASSIC -->
<div align="center">


# MULTI-DISTUBE-BOTS

<em>Unleash Limitless Music, Seamlessly Drive Your Community</em>

<!-- BADGES -->
<img src="https://img.shields.io/github/license/ductridev/multi-distube-bots?style=flat&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">
<img src="https://img.shields.io/github/last-commit/ductridev/multi-distube-bots?style=flat&logo=git&logoColor=white&color=0080ff" alt="last-commit">
<img src="https://img.shields.io/github/languages/top/ductridev/multi-distube-bots?style=flat&color=0080ff" alt="repo-top-language">
<img src="https://img.shields.io/github/languages/count/ductridev/multi-distube-bots?style=flat&color=0080ff" alt="repo-language-count">

<em>Built with the tools and technologies:</em>

<img src="https://img.shields.io/badge/JSON-000000.svg?style=flat&logo=JSON&logoColor=white" alt="JSON">
<img src="https://img.shields.io/badge/npm-CB3837.svg?style=flat&logo=npm&logoColor=white" alt="npm">
<img src="https://img.shields.io/badge/Mongoose-F04D35.svg?style=flat&logo=Mongoose&logoColor=white" alt="Mongoose">
<img src="https://img.shields.io/badge/.ENV-ECD53F.svg?style=flat&logo=dotenv&logoColor=black" alt=".ENV">
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=TypeScript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/tsnode-3178C6.svg?style=flat&logo=ts-node&logoColor=white" alt="tsnode">
<img src="https://img.shields.io/badge/Discord-5865F2.svg?style=flat&logo=Discord&logoColor=white" alt="Discord">

</div>
<br>

---

## Table of Contents

- [MULTI-DISTUBE-BOTS](#multi-distube-bots)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Usage](#usage)
    - [Testing](#testing)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

---

## Overview

multi-distube-bots is a comprehensive toolkit for deploying and managing multiple Discord music bots with ease. It offers scalable architecture, seamless media playback, and rich user interaction features to create engaging voice channel experiences.

**Why multi-distube-bots?**

This project empowers developers to build robust, multi-instance Discord music bots that handle complex interactions and media sources effortlessly. The core features include:

- 🧩 **🎛️ Modular Architecture:** Easily manage multiple bots and commands with dynamic loading and centralized control.
- 🎶 **🎵 Advanced Music Playback:** Supports plugins for diverse media sources, playlist management, and real-time queue controls.
- 🚀 **⚙️ Configuration & Session Persistence:** Maintain global settings and user sessions across restarts for a smooth user experience.
- 💬 **🛠️ Rich User Interaction:** Utility functions for styled messages, voting UI, and detailed help commands enhance user engagement.
- 🔄 **🔧 Event-Driven Design:** Handles real-time Discord events for voice state updates and playback events, ensuring responsive performance.

---

## Features

|      | Component         | Details                                                                                                                                                                                                                                |
| :--- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️    | **Architecture**  | <ul><li>Modular design separating core bot logic, command handling, and integrations</li><li>Uses event-driven architecture with Discord.js event emitters</li></ul>                                                                   |
| 🔩    | **Code Quality**  | <ul><li>TypeScript used for type safety and maintainability</li><li>Consistent code style with ESLint configurations</li></ul>                                                                                                         |
| 📄    | **Documentation** | <ul><li>Basic README with setup instructions</li><li>Comments and JSDoc annotations present in source code</li></ul>                                                                                                                   |
| 🔌    | **Integrations**  | <ul><li>Discord.js for Discord interactions</li><li>DisTube for music playback and streaming</li><li>Spotify, Deezer, SoundCloud, YouTube via respective APIs</li><li>Voice support via @discordjs/voice and @discordjs/opus</li></ul> |
| 🧩    | **Modularity**    | <ul><li>Separate modules for commands, events, and plugins</li><li>Configurable via JSON files and environment variables</li></ul>                                                                                                     |
| 🧪    | **Testing**       | <ul><li>Limited testing setup; no explicit test framework shown in dependencies</li><li>Potential for unit tests with TypeScript and mock modules</li></ul>                                                                            |
| ⚡️    | **Performance**   | <ul><li>Uses distube for efficient music streaming and caching</li><li>Asynchronous event handling for responsiveness</li></ul>                                                                                                        |
| 🛡️    | **Security**      | <ul><li>Uses environment variables for sensitive data</li><li>Basic validation of config files</li></ul>                                                                                                                               |
| 📦    | **Dependencies**  | <ul><li>Core: discord.js, distube, mongoose</li><li>Music & streaming: @distube/*, ytdl, yt-search</li><li>Voice & audio: @discordjs/voice, @discordjs/opus, prism-media</li><li>Type definitions for TypeScript</li></ul>             |

---

## Project Structure

```sh
└── multi-distube-bots/
    ├── index.ts
    ├── package-lock.json
    ├── package.json
    ├── src
    │   ├── @types
    │   ├── bot
    │   ├── botManager.ts
    │   ├── commands
    │   ├── config.json
    │   ├── config.ts
    │   ├── models
    │   └── utils
    └── tsconfig.json
```

---

## Getting Started

### Prerequisites

This project requires the following dependencies:

- **Programming Language:** TypeScript
- **Package Manager:** Npm

### Installation

Build multi-distube-bots from the source and install dependencies:

1. **Clone the repository:**

    ```sh
    ❯ git clone https://github.com/ductridev/multi-distube-bots
    ```

2. **Navigate to the project directory:**

    ```sh
    ❯ cd multi-distube-bots
    ```

3. **Install the dependencies:**

**Using [npm](https://www.npmjs.com/):**

```sh
❯ npm install
```

### Usage

Run the project with:

**Using [npm](https://www.npmjs.com/):**

```sh
npm start
```

### Testing

Multi-distube-bots uses the {__test_framework__} test framework. Run the test suite with:

**Using [npm](https://www.npmjs.com/):**

```sh
npm test
```

---

## Contributing

- **💬 [Join the Discussions](https://github.com/ductridev/multi-distube-bots/discussions)**: Share your insights, provide feedback, or ask questions.
- **🐛 [Report Issues](https://github.com/ductridev/multi-distube-bots/issues)**: Submit bugs found or log feature requests for the `multi-distube-bots` project.
- **💡 [Submit Pull Requests](https://github.com/ductridev/multi-distube-bots/blob/main/CONTRIBUTING.md)**: Review open PRs, and submit your own PRs.

<details closed>
<summary>Contributing Guidelines</summary>

1. **Fork the Repository**: Start by forking the project repository to your github account.
2. **Clone Locally**: Clone the forked repository to your local machine using a git client.
   ```sh
   git clone https://github.com/ductridev/multi-distube-bots
   ```
3. **Create a New Branch**: Always work on a new branch, giving it a descriptive name.
   ```sh
   git checkout -b new-feature-x
   ```
4. **Make Your Changes**: Develop and test your changes locally.
5. **Commit Your Changes**: Commit with a clear message describing your updates.
   ```sh
   git commit -m 'Implemented new feature x.'
   ```
6. **Push to github**: Push the changes to your forked repository.
   ```sh
   git push origin new-feature-x
   ```
7. **Submit a Pull Request**: Create a PR against the original project repository. Clearly describe the changes and their motivations.
8. **Review**: Once your PR is reviewed and approved, it will be merged into the main branch. Congratulations on your contribution!
</details>

<details closed>
<summary>Contributor Graph</summary>
<br>
<p align="left">
   <a href="https://github.com{/ductridev/multi-distube-bots/}graphs/contributors">
      <img src="https://contrib.rocks/image?repo=ductridev/multi-distube-bots">
   </a>
</p>
</details>

---

## License

Multi-distube-bots is protected under the [LICENSE](https://choosealicense.com/licenses) License. For more details, refer to the [LICENSE](https://choosealicense.com/licenses/) file.

---

## Acknowledgments

- Credit `contributors`, `inspiration`, `references`, etc.

<div align="left"><a href="#top">⬆ Return</a></div>

---
