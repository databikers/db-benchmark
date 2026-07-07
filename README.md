1. Install dependencies:

```shell
npm i
```

2. Prepare and start the infrastructure:
```shell
docker rmi db_test_diana-db:latest
docker build -t diana-db:latest .
docker-compose up -d
```

3. Run the benchmark
```shell
npm start
```