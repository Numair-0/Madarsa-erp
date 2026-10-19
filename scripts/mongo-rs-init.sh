#!/usr/bin/env bash
# Local (non-Docker) setup:  mongod --replSet rs0 --dbpath ./data --port 27017 &   then run this once.
set -euo pipefail
mongosh --quiet --eval "try { rs.status().ok } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}) }"
