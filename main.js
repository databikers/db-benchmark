// Required packages
const { MongoClient } = require('mongodb');
const { DataSource } = require('typeorm');
const { DianaDb, Model, Types } = require('@diana-db/odm');

const NUM_USERS = 10000;
const LIMIT = 10;
const SKIP = 100;

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomDateDi(start, end) {
  return Math.random() > 0.5 ? start : end;
}

function generateUser() {
  const firstNames = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Ethan',
    'Fiona',
    'George',
    'Hana',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Kobayashi',
    'Garcia',
    'Brown',
    'Lee',
    'Ivanov',
    'Tanaka',
  ];
  const sexes = [
    'male',
    'female',
    'non-binary',
  ];
  const tagsPool = [
    'tech',
    'gaming',
    'art',
    'finance',
    'travel',
    'music',
    'sports',
  ];

  const name = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
  const sex = randomElement(sexes);
  const birthday = randomDate(new Date(1970, 0, 1), new Date(2005, 11, 31));
  const tags = Array.from(
    new Set(Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => randomElement(tagsPool))),
  );

  return { name, sex, birthday, tags };
}

function generateUserDi() {
  const user = generateUser();
  return {
    ...user,
    birthday: randomDateDi(new Date(1990, 3, 21).toISOString(), new Date(2005, 11, 18).toISOString()),
  };
}

// MongoDB Native Driver
async function benchmarkMongoNative() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('benchmark');
  const usersCollection = db.collection('users');

  const users = Array.from({ length: NUM_USERS }, generateUser);
  console.time('MongoDB Insert');
  for (const user of users) {
    await usersCollection.insertOne(user);
  }
  console.timeEnd('MongoDB Insert');

  console.time('MongoDB Query');
  await usersCollection.find({ name: 'Diana' }).sort({ _id: -1 }).skip(SKIP).limit(LIMIT).toArray();
  console.timeEnd('MongoDB Query');
  await client.close();
}

// PostgreSQL TypeORM
async function benchmarkPostgresORM() {
  class User {
    constructor(name, sex, birthday, tags) {
      this.name = name;
      this.sex = sex;
      this.birthday = birthday;
      this.tags = tags;
    }
  }

  const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'benchmark',
    password: 'benchmark',
    database: 'benchmark',
    synchronize: true,
    logging: false,
    entities: [User],
  });

  const { Entity, PrimaryGeneratedColumn, Column } = require('typeorm');
  Entity('users')(User);
  PrimaryGeneratedColumn()(User.prototype, 'id');
  Column('text')(User.prototype, 'name');
  Column('text')(User.prototype, 'sex');
  Column('date')(User.prototype, 'birthday');
  Column('text', { array: true })(User.prototype, 'tags');

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);

  const users = Array.from({ length: NUM_USERS }, generateUser).map(
      (u) => new User(u.name, u.sex, u.birthday, u.tags)
  );
  console.time('PostgreSQL Insert');
  for (const u of users) {
    await userRepo.save(u);
  }
  console.timeEnd('PostgreSQL Insert');

  console.time('PostgreSQL Query');
  await userRepo.find({ skip: SKIP, take: LIMIT, where: { name: 'Diana' } });
  console.timeEnd('PostgreSQL Query');
  await AppDataSource.destroy();
}

// Diana DB
async function benchmarkDianaDb() {
  try {
    const client = new DianaDb({
      user: 'admin',
      password: 'admin',
      host: '127.0.0.1',
      port: 34567,
      connectionPoolSize: 5,
      connectTimeoutValue: 5000,
      logger: console,
    });

    const userModel = new Model({
      database: 'user',
      collection: 'user',
      name: 'User',
      schema: {
        name: { type: Types.STRING, required: true },
        sex: { type: Types.STRING, required: true },
        birthday: { type: Types.TIME },
        tags: { type: Types.ARRAY, items: Types.STRING },
      },
    });
    await client.connect(5000);

    const users = Array.from({ length: NUM_USERS }, generateUserDi);
    console.time('DianaDB Insert');
    for (const user of users) {
      await userModel.insert(user).catch(console.error);
    }
    console.timeEnd('DianaDB Insert');

    console.time('DianaDB Query');
    await userModel.find([{ name: 'Diana' }], [], { _id: -1 }, SKIP, LIMIT);
    console.timeEnd('DianaDB Query');
    await client.disconnect();
  } catch (e) {
    console.error(e);
  }
}

(async () => {
  console.log(`Starting DB benchmarking with ${NUM_USERS} docs/rows`);
  console.log(``);

  console.log('--- MongoDB Benchmark ---');
  await benchmarkMongoNative();

  console.log('\n--- DianaDB Benchmark ---');
  await benchmarkDianaDb();

  console.log('\n--- PostgreSQL Benchmark ---');
  await benchmarkPostgresORM();
})();
