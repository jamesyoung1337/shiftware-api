# shiftware-api
Shiftware API built with Node + Typescript + AdonisJS + Postgres + Redis

Ensure you have Node 14 or 16 installed (use `nvm` or similar) and activate your environment.

### Install
`yarn install`

### Create Postgres Database
Download a Postgres installer if you don't have it installed.  Use the usual steps if on Linux, otherwise [download a Pg installer] (https://www.postgresql.org/download/windows/). Open the `psql` shell, and create the database. For example [create database](https://www.guru99.com/postgresql-create-database.html).

![Screenshot of CREATE DATABASE example](https://cdn.guru99.com/images/1/092818_0513_PostgreSQLC3.png "Create database example")

### Install Ubuntu for Windows
If you're on Windows, the easiest way to run a few services like Redis is to get a Linux environment. [Install Ubuntu on Windows 10](https://ubuntu.com/tutorials/ubuntu-on-windows#1-overview)

Once Ubuntu is installed, install the Redis server.

```
sudo apt update
sudo apt upgrade
sudo apt install redis-server
```

Start the Redis service:

`sudo service redis-server start`

This will need to be done every time you want to run the dev environment.

### Run in dev mode
`yarn dev`
