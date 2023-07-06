# split-pg-sql

split postgres sql queries

## Install

```bash
npm install split-pg-sql
```

## Usage

```javascript
import splitPgSql from "split-pg-sql";

const sqls = splitPgSql("select 1;select 2;");
// then sqls will be:
// [
//   'select 1;',
//   'select 2;'
// ]
```
