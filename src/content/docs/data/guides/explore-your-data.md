---
title: Explore your own data
description: Set up JupyterLab, connect it to the database of your Home Assistant, and run your first report. About fifteen minutes.
order: 2
source: https://github.com/home-assistant/home-assistant-notebooks/blob/master/GETTING_STARTED.ipynb
lastVerified: 2026-10-16
---

Home Assistant records everything that happens in your home in a database: every state change, every event, and statistics over time. That data is yours, and you can learn a lot from it. When does the heating run? Which lights are on the longest? How does your energy use change with the seasons?

This guide sets up [JupyterLab](https://jupyterlab.readthedocs.io/en/stable/), a tool that data scientists all over the world use, and runs a first report on your own data. Your data stays on your own hardware the whole time.

## How it fits together

- **JupyterLab** runs notebooks: documents that mix text, code, and charts. Think of a notebook as a document that can also calculate.
- **HASS Data Detective** is a Python library that reads the Home Assistant database, and turns it into tables you can work with.
- **The Home Assistant notebooks** are ready-made notebooks to start from, in the [home-assistant-notebooks repository](https://github.com/home-assistant/home-assistant-notebooks).

## Option 1: as an app on Home Assistant OS

If you run Home Assistant OS, the easiest way is the JupyterLab app from the Home Assistant Community Apps.

1. Open the [JupyterLab app in your Home Assistant](https://my.home-assistant.io/redirect/supervisor_app/?app=a0d7b954_jupyterlablite&repository_url=https%3A%2F%2Fgithub.com%2Fhassio-addons%2Frepository). This also adds the Community Apps repository, if you do not have it yet.
2. Install the app, and start it.
3. Open the web interface of the app. It can take a minute to start the first time.

The app has access to your configuration folder, where the default database `home-assistant_v2.db` lives. The first time it starts, it also clones the Home Assistant notebooks into `notebooks/home-assistant` in that folder, so you can skip the next step about getting them.

## Option 2: on your own computer

If you run Home Assistant in another way, or prefer to work on a separate computer, install JupyterLab with Python:

```bash
mkdir ~/notebooks
cd ~/notebooks
python3 -m venv .venv
source .venv/bin/activate
pip install jupyterlab HASS-data-detective seaborn
jupyter lab
```

JupyterLab opens in your browser. Data Detective reads the database, and seaborn draws plots.

On Python 3.13 or newer, pip installs HASS Data Detective 3.2, because later versions need an older Python. The notebook works with 3.2.

You need access to the database. With the default SQLite database, copy `home-assistant_v2.db` from your configuration folder to your computer. Make the copy while Home Assistant is stopped, or from a backup, so you do not get a half-written file.

If you use MariaDB, MySQL, or PostgreSQL for the recorder, connect to it directly instead. Create a separate database user with read-only rights for this. Your notebooks only need to read.

Python also needs a driver for that database. Install it in the same virtual environment, and start the database URL with the matching prefix:

- **MariaDB or MySQL**: `pip install pymysql`, and a URL that starts with `mysql+pymysql://`. If you copy the `db_url` of your recorder and it starts with `mysql://`, change that part.
- **PostgreSQL**: `pip install "psycopg[binary]"`, and a URL that starts with `postgresql://`.

On the PostgreSQL server, a read-only user for a recorder database called `hass` looks like this:

```sql
CREATE USER datascience WITH PASSWORD 'my_secret_password';
GRANT CONNECT ON DATABASE hass TO datascience;
GRANT USAGE ON SCHEMA public TO datascience;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datascience;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO datascience;
```

The `ALTER DEFAULT PRIVILEGES` statement only applies to tables created by the user that runs it. Run it as the user Home Assistant connects with, and the new user can also read tables that a future schema migration creates.

## Get the notebooks

On your own computer, open a terminal from the JupyterLab launcher, and clone the notebooks:

```bash
git clone https://github.com/home-assistant/home-assistant-notebooks.git
```

## Run your first report

1. In the file browser on the left, open the notebooks folder (`home-assistant-notebooks` on your own computer, `notebooks/home-assistant` in the app), and then `GETTING_STARTED.ipynb`.
2. Find the code cell with `db = detective.db_from_hass_config()`. In the app, leave it as it is: it finds the database through your configuration. On your own computer, it cannot find it, so replace that line with a connection to your copy. For a copy of `home-assistant_v2.db` in the same folder as the notebook:

   ```python
   db = detective.HassDatabase("sqlite:///home-assistant_v2.db")
   ```

   For MariaDB, MySQL, or PostgreSQL, pass the same kind of database URL as the `db_url` of your recorder instead.
3. Run the cells from the top: select the first code cell, and press <kbd>Shift</kbd> + <kbd>Enter</kbd> to run it and move to the next one.

The notebook reads your sensor data into a table, and plots it. It works with SQLite, MariaDB, MySQL, and PostgreSQL, and **Run** > **Run All Cells** runs every cell in one go. On a big database this takes a while. A cell that is still running shows `[*]` next to it. When it is done, the asterisk changes into a number.

## Read the database with pandas

To start from scratch, or to see what the notebook does under the hood: [pandas](https://pandas.pydata.org/) and SQLAlchemy, which the `pip install` above already brought in, read the database directly. Paste this into a new cell of a notebook, next to your copy of `home-assistant_v2.db`:

```python
import pandas as pd
import sqlalchemy

engine = sqlalchemy.create_engine("sqlite:///home-assistant_v2.db")

query = sqlalchemy.text("""
    SELECT states_meta.entity_id, states.state, states.last_updated_ts
    FROM states
    JOIN states_meta ON states.metadata_id = states_meta.metadata_id
    WHERE states_meta.entity_id LIKE 'sensor.%'
""")

df = pd.read_sql(query, engine)
df["last_updated"] = pd.to_datetime(
    df["last_updated_ts"], unit="s", utc=True
)
df["state"] = pd.to_numeric(df["state"], errors="coerce")
df = df.dropna(subset=["state"])

print(df.groupby("entity_id")["state"].describe())
```

This reads the states of all your sensors, turns the timestamps into dates, keeps only the numeric states, and prints the count, average, minimum, and maximum for each sensor. From here, `df` is a regular pandas table you can filter, group, and plot.

The query is plain SQL, the same kind the notebook uses on every database, so for MariaDB, MySQL, or PostgreSQL you only change the database URL.

## Make it your own

The best part: everything in the notebook can be changed. Edit a cell, run only that cell, and see the new result right away. You do not need to run the whole notebook again.

When you want to go further:

- The [HASS Data Detective examples](https://github.com/robmarkcole/HASS-data-detective) show more ways to query and plot your data.
- [The data model](/data/reference/data-model/) and [Database schema](/data/reference/database-schema/) explain what is in the database.
- [Query the database](/data/guides/query-the-database/) has SQL queries to start from.

## Share what you learn

Made a notebook that others could use? Share the notebook without the output, so it contains no data of your home, and others can run it on their own data. The [community forum](https://community.home-assistant.io/) is a good place to show it.
