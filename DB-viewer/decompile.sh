cat $1 | sed -n -e '/<!-- XMLDATA/,$p' | cut -d'"' -f4 | base64 -d
