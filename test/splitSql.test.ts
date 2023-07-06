import splitPgSql from "../lib";

const validIdentifiers = [
  "",
  "tag",
  "TAG",
  "tag0",
  "_",
  "tag0",
  "tag_0",
  "_tag0",
  "标签",
];
const invalidIdentifiers = [
  "0tag",
  "\u0000",
  "\u001f",
  "\u0020",
  "\u002f",
  "\u003a",
  "\u0040",
  "\u005b",
  "\u005e",
  "\u0060",
  "\u007b",
  "\u007e",
];

describe("parseMultiSql", () => {
  const tests = [
    {
      name: "lineComment",
      sql: `foo-- this is a lineComment\nbar;`,
      toEqual: [`foo\nbar;`],
    },
    {
      name: "lineComment not end",
      sql: `foo-- this is a lineComment bar;`,
      toEqual: [`foo`],
    },
    {
      name: "single dash is not lineComment",
      sql: `foo- this is a lineComment bar;`,
      toEqual: [`foo- this is a lineComment bar;`],
    },
    {
      name: "blockComment",
      sql: `foo/* this is a blockComment */bar;`,
      toEqual: [`foobar;`],
    },

    {
      name: "single slash is not blockComment",
      sql: `foo/ this is a blockComment */bar;`,
      toEqual: [`foo/ this is a blockComment */bar;`],
    },

    {
      name: "single star is not blockComment",
      sql: `foo* this is not a blockComment */bar;`,
      toEqual: [`foo* this is not a blockComment */bar;`],
    },

    {
      name: "blockComment not end",
      sql: `foo/* this is a blockComment bar;`,
      toEqual: [`foo`],
    },

    {
      name: "nestedBlockComment",
      sql: `foo/* this /*is*/ /*/*a*/ blockComment*/ */bar;`,
      toEqual: [`foobar;`],
    },
    {
      name: "nestedBlockComment with backslash",
      sql: `foo/* this \\/*is*/ \\\\/*/*a*/ blockComment*/ */bar;`,
      toEqual: [`foobar;`],
    },
    {
      name: "lineComment in nestedBlockComment",
      sql: `foo/* -- lineComment \nthis \\/*-- lineComment \nis*/ \\-- lineComment \n\\/*/*a -- lineComment \n */ --lineComment\n blockComment*/ */bar;`,
      toEqual: [`foobar;`],
    },
    {
      name: "nestedBlockComment not end",
      sql: `foo/* this /*is*/ /*/*a*/ blockComment*/ bar;`,
      toEqual: [`foo`],
    },
    {
      name: "empty ' string",
      sql: `foo''bar;`,
      toEqual: [`foo''bar;`],
    },
    {
      name: "' string",
      sql: `foo'string'bar;`,
      toEqual: [`foo'string'bar;`],
    },
    {
      name: "' string multi line",
      sql: `foo'string\nstring'bar;`,
      toEqual: [`foo'string\nstring'bar;`],
    },
    {
      name: "' string not end",
      sql: `foo'string\nstring`,
      toEqual: [`foo'string\nstring`],
    },
    {
      name: "' string includes lineComment",
      sql: `foo'string--lineComment'bar;`,
      toEqual: [`foo'string--lineComment'bar;`],
    },
    {
      name: "' string includes lineComment eol",
      sql: `foo'string--lineComment\n'bar;`,
      toEqual: [`foo'string--lineComment\n'bar;`],
    },
    {
      name: "' string includes blockComment",
      sql: `foo'string/*blockComment*/'bar;`,
      toEqual: [`foo'string/*blockComment*/'bar;`],
    },
    {
      name: "' string includes blockComment not end",
      sql: `foo'string/*blockComment'bar;`,
      toEqual: [`foo'string/*blockComment'bar;`],
    },
    {
      name: "' string end with a backSlash is not end",
      sql: `foo'string\\'/**/bar;`,
      toEqual: [`foo'string\\'/**/bar;`],
    },
    {
      name: "' string end with double backSlash is end",
      sql: `foo'string\\\\'/**/bar;`,
      toEqual: [`foo'string\\\\'bar;`],
    },
    {
      name: "' string end with three backSlash is not end",
      sql: `foo'string\\\\\\'/**/bar;`,
      toEqual: [`foo'string\\\\\\'/**/bar;`],
    },
    {
      name: "' string end with three backSlash inside is end",
      sql: `foo'string\\\\\\x'/**/bar;`,
      toEqual: [`foo'string\\\\\\x'bar;`],
    },
    //
    {
      name: 'empty " string',
      sql: `foo""bar;`,
      toEqual: [`foo""bar;`],
    },
    {
      name: '" string',
      sql: `foo"string"bar;`,
      toEqual: [`foo"string"bar;`],
    },
    {
      name: '" string multi line',
      sql: `foo"string\nstring"bar;`,
      toEqual: [`foo"string\nstring"bar;`],
    },
    {
      name: '" string not end',
      sql: `foo"string\nstring`,
      toEqual: [`foo"string\nstring`],
    },
    {
      name: '" string includes lineComment',
      sql: `foo"string--lineComment"bar;`,
      toEqual: [`foo"string--lineComment"bar;`],
    },
    {
      name: '" string includes lineComment eol',
      sql: `foo"string--lineComment\n"bar;`,
      toEqual: [`foo"string--lineComment\n"bar;`],
    },
    {
      name: '" string includes blockComment',
      sql: `foo"string/*blockComment*/"bar;`,
      toEqual: [`foo"string/*blockComment*/"bar;`],
    },
    {
      name: '" string includes blockComment notEnd',
      sql: `foo"string/*blockComment"bar;`,
      toEqual: [`foo"string/*blockComment"bar;`],
    },
    {
      name: "single normal sql",
      sql: `\nselect * from t_test;\n`,
      toEqual: ["select * from t_test;"],
    },
    {
      name: "multiple normal sql",
      sql: `\nselect * from t_test1;\nselect * from t_test2;\nselect * from t_test3;\n`,
      toEqual: [
        "select * from t_test1;",
        "select * from t_test2;",
        "select * from t_test3;",
      ],
    },
    {
      name: "single complex sql with comment",
      sql: `
    -- Query1 "价格摘要"报告查询('Q1')
    select
      l_returnflag,
      l_linestatus,
      sum(l_quantity) as sum_qty,
      sum(l_extendedprice) as sum_base_price,
      sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
      sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
      avg(l_quantity) as avg_qty,
      avg(l_extendedprice) as avg_price,
      avg(l_discount) as avg_disc,
      count(*) as count_order
    from
      lineitem /* this is the /*table*/ of "line" item */
    where
      l_shipdate <= date '1998-12-01' - interval '88 day' -- interval number is /* random */;
    group by
      l_returnflag, ---return; --flag
      l_linestatus
    order by
      l_returnflag,
      l_linestatus;`,
      toEqual: [
        `select
      l_returnflag,
      l_linestatus,
      sum(l_quantity) as sum_qty,
      sum(l_extendedprice) as sum_base_price,
      sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
      sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
      avg(l_quantity) as avg_qty,
      avg(l_extendedprice) as avg_price,
      avg(l_discount) as avg_disc,
      count(*) as count_order
    from
      lineitem 
    where
      l_shipdate <= date '1998-12-01' - interval '88 day' 
    group by
      l_returnflag, 
      l_linestatus
    order by
      l_returnflag,
      l_linestatus;`,
      ],
    },
    {
      name: "multiple sql with comment ",
      sql: `
    -- create table "\\\\\\\'\\
    create table t_demo (id int, name varchar(50));
    /* insert value */
    insert into t_demo values (1,'/*o--o/* o*/');
    insert into t_demo values (2,'--v//a---r');
    -- create view '\'
    CREATE VIEW view1 AS SELECT * FROM t_demo
    WHERE id = 1;
    -- create funciton '\''
    CREATE FUNCTION dup(in int, out f1 int, out f2 text)
        AS $$ SELECT $1, CAST($1 AS text) || ' is text' $$
        LANGUAGE SQL;
      `,
      toEqual: [
        `create table t_demo (id int, name varchar(50));`,
        `insert into t_demo values (1,'/*o--o/* o*/');`,
        `insert into t_demo values (2,'--v//a---r');`,
        `CREATE VIEW view1 AS SELECT * FROM t_demo
    WHERE id = 1;`,
        `CREATE FUNCTION dup(in int, out f1 int, out f2 text)
        AS $$ SELECT $1, CAST($1 AS text) || ' is text' $$
        LANGUAGE SQL;`,
      ],
    },
    {
      name: "sql end without semicolon",
      sql: `create table t_demo (id int, name varchar(50))`,
      toEqual: [`create table t_demo (id int, name varchar(50))`],
    },
    { name: "no sql", sql: `\n\t`, toEqual: [] },
    {
      name: "$$",
      sql: `
        select $$
          a
        $$;
        select $a$
          a
        $a$;
        select $_x$
          a
        $_x$;
        select $_$
          a
        $_$;
        select $_$
          select $$$$;
          select $$$$;
        $_$;
        end
      `,
      toEqual: [
        `select $$
          a
        $$;`,
        `select $a$
          a
        $a$;`,
        `select $_x$
          a
        $_x$;`,
        `select $_$
          a
        $_$;`,
        `select $_$
          select $$$$;
          select $$$$;
        $_$;`,
        "end",
      ],
    },
    {
      name: "$$ in string",
      sql: `
        select '$$';
        select * from "$$";
        select * from "$""$";
      `,
      toEqual: [`select '$$';`, `select * from "$$";`, `select * from "$""$";`],
    },
    {
      name: "$$ tag tail",
      sql: `
        select $ab$;$cab$;end;
      `,
      toEqual: [`select $ab$;$cab$;end;`],
    },
    {
      name: "$$ tag tail 2",
      sql: `
        select $ab$;$cab$$ab$;end;
      `,
      toEqual: [`select $ab$;$cab$$ab$;`, "end;"],
    },
    {
      name: "select $ab$;$cab$x$ab$ a$b$$;",
      sql: `
        select $ab$;$cab$x$ab$ a$b$$;end;
      `,
      toEqual: [`select $ab$;$cab$x$ab$ a$b$$;`, "end;"],
    },
    {
      name: "select $ab$;$cab$x$ab$a$b$$;",
      sql: `
        select $ab$;$cab$x$ab$a$b$$;end;
      `,
      toEqual: [`select $ab$;$cab$x$ab$a$b$$;`, "end;"],
    },
    {
      name: "$$ in commnet",
      sql: `
            -- select $$a$
            select $$a$$;
            /*
              select $$a
            */
            select $$b$$;
          `,
      toEqual: [`select $$a$$;`, `select $$b$$;`],
    },
    {
      name: "$$ with valid tagName",
      sql: validIdentifiers
        .map((tag) => `select $${tag}$;$${tag}$;`)
        .join("\n"),
      toEqual: validIdentifiers.map((tag) => `select $${tag}$;$${tag}$;`),
    },
    ...invalidIdentifiers.map((tag) => ({
      name: `$$ with invalid tagName ${tag}`,
      sql: `select $${tag}$;$${tag}$;`,
      toEqual: [`select $${tag}$;`, `$${tag}$;`],
    })),
    {
      name: "create function",
      sql: `
CREATE FUNCTION public.db_to_csv(path text) RETURNS void
  LANGUAGE plpgsql
  AS $$
declare
  tables RECORD;
  statement TEXT;
begin
FOR tables IN 
  SELECT (table_schema || '.' || table_name) AS schema_table
  FROM information_schema.tables t INNER JOIN information_schema.schemata s 
  ON s.schema_name = t.table_schema 
  WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND t.table_type NOT IN ('VIEW')
  ORDER BY schema_table
LOOP
  statement := 'COPY ' || tables.schema_table || ' TO ''' || path || '/' || tables.schema_table || '.csv' ||''' DELIMITER '';'' CSV HEADER';
  EXECUTE statement;
END LOOP;
return;  
end;
$$;
CREATE FUNCTION public.db_to_csv(path text) RETURNS void
  LANGUAGE plpgsql
  AS $$
declare
  tables RECORD;
  statement TEXT;
begin
FOR tables IN 
  SELECT (table_schema || '.' || table_name) AS schema_table
  FROM information_schema.tables t INNER JOIN information_schema.schemata s 
  ON s.schema_name = t.table_schema 
  WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND t.table_type NOT IN ('VIEW')
  ORDER BY schema_table
LOOP
  statement := 'COPY ' || tables.schema_table || ' TO ''' || path || '/' || tables.schema_table || '.csv' ||''' DELIMITER '';'' CSV HEADER';
  EXECUTE statement;
END LOOP;
return;  
end;
$$;
      `,
      toEqual: [
        "CREATE FUNCTION public.db_to_csv(path text) RETURNS void\n  LANGUAGE plpgsql\n  AS $$\ndeclare\n  tables RECORD;\n  statement TEXT;\nbegin\nFOR tables IN \n  SELECT (table_schema || '.' || table_name) AS schema_table\n  FROM information_schema.tables t INNER JOIN information_schema.schemata s \n  ON s.schema_name = t.table_schema \n  WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')\n  AND t.table_type NOT IN ('VIEW')\n  ORDER BY schema_table\nLOOP\n  statement := 'COPY ' || tables.schema_table || ' TO ''' || path || '/' || tables.schema_table || '.csv' ||''' DELIMITER '';'' CSV HEADER';\n  EXECUTE statement;\nEND LOOP;\nreturn;  \nend;\n$$;",
        "CREATE FUNCTION public.db_to_csv(path text) RETURNS void\n  LANGUAGE plpgsql\n  AS $$\ndeclare\n  tables RECORD;\n  statement TEXT;\nbegin\nFOR tables IN \n  SELECT (table_schema || '.' || table_name) AS schema_table\n  FROM information_schema.tables t INNER JOIN information_schema.schemata s \n  ON s.schema_name = t.table_schema \n  WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')\n  AND t.table_type NOT IN ('VIEW')\n  ORDER BY schema_table\nLOOP\n  statement := 'COPY ' || tables.schema_table || ' TO ''' || path || '/' || tables.schema_table || '.csv' ||''' DELIMITER '';'' CSV HEADER';\n  EXECUTE statement;\nEND LOOP;\nreturn;  \nend;\n$$;",
      ],
    },
  ];
  tests.forEach(({ name, sql, toEqual }) => {
    it(name, () => {
      expect(splitPgSql(sql)["pureSqls"]).toEqual(toEqual);
    });
  });
});
