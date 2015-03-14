# thanks Tyler (https://github.com/TylerBrock/mongo-hacker/blob/master/Makefile)

install:
	@echo "INSTALLATION"

	npm install
	npm run build

	@if grep -q ".mongo-views\.js" ~/.mongorc.js ; \
	then \
	\
		echo "mongo-views already installed. Ending." ; \
		\
	else \
		echo "linking local dist/bundled.js to ~/.mongo-views.js" ; \
		ln -sf "$(CURDIR)/dist/bundled.js" ~/.mongo-views.js ; \
		echo "appending a load script to ~/.mongorc.js to load symlinked index file" ; \
		echo "load(\"$(HOME)/.mongo-views.js\");" >> ~/.mongorc.js; \
	fi

build:
	npm run build

check:
	@test -n "$$(which npm)" || \
	(echo "Need node package manager 'npm' to test mongo-views" && false)
	npm install
	npm test
