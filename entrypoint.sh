#!/bin/sh
set -e
touch /var/lib/diana-db/current.didb
touch /var/lib/diana-db/users
/usr/bin/diana-db add-user -u admin -p admin
/usr/bin/diana-db grant-access -u admin -db test:3
/usr/bin/diana-db-server