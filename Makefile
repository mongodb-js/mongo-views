# thanks Tyler (https://github.com/TylerBrock/mongo-hacker/blob/master/Makefile)

install:
	@echo "INSTALLATION"

	@if grep -q ".mongo-views\.js" ~/.mongorc.js ; \
	then \
	\
		echo "mongo-views already installed. Ending." ; \
		\
	else \
		echo "linking local index.js to ~/.mongo-views.js" ; \
		ln -sf "$(CURDIR)/index.js" ~/.mongo-views.js ; \
		echo "appending a load script to ~/.mongorc.js to load symlinked index file" ; \
		echo "var __CURDIR = '$(CURDIR)'; \nload(\"$(HOME)/.mongo-views.js\");" >> ~/.mongorc.js; \
	fi

check:
	@test -n "$$(which npm)" || \
	(echo "Need node package manager 'npm' to test mongo-views" && false)
	npm install
	npm test
