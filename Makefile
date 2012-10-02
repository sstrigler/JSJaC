OUTFILE=./jsjac.js
PACKFILE=./jsjac.packed.js
UNCOMPRESSED=./jsjac.uncompressed.js
SRC=src/jsextras.js src/crypt.js src/JSJaCJSON.js src/xmlextras.js \
src/JSJaCBuilder.js src/JSJaCConstants.js \
src/JSJaCConsoleLogger.js src/JSJaCCookie.js src/JSJaCError.js \
src/JSJaCJID.js src/JSJaCKeys.js src/JSJaCPacket.js src/JSJaCConnection.js \
src/JSJaCHttpBindingConnection.js src/JSJaCWebSocketConnection.js \
src/JSJaCFBApplication.js \
src/JSJaC.js

POLLING_SRC=src/jsextras.js src/crypt.js src/JSJaCJSON.js src/xmlextras.js \
src/JSJaCBuilder.js src/JSJaCConstants.js \
src/JSJaCConsoleLogger.js src/JSJaCCookie.js src/JSJaCError.js \
src/JSJaCJID.js src/JSJaCKeys.js src/JSJaCPacket.js src/JSJaCConnection.js \
src/JSJaCHttpPollingConnection.js \
src/JSJaCFBApplication.js \
src/JSJaC.js

all: clean utils install doc
polling: clean utils polling_install doc

install: build uncompressed crunch
	@echo "done."

polling_install: polling_build uncompressed crunch
	@echo "done."

build:
	@echo "building ...";
	@for i in ${SRC}; do \
		echo "\t$$i"; \
		cat "$$i" >> $(OUTFILE); \
	done

polling_build:
	@echo "building ...";
	@for i in ${POLLING_SRC}; do \
		echo "\t$$i"; \
		cat "$$i" >> $(OUTFILE); \
	done

crunch:
	@echo "crunching ..."
	@if [ -e $(OUTFILE) ]; then \
		utils/jsmin < $(OUTFILE) > $(OUTFILE).tmp && \
		cat src/header.js > $(OUTFILE) && \
		cat src/JSJaCConfig.js >> $(OUTFILE) && \
		cat $(OUTFILE).tmp >> $(OUTFILE) && \
		rm $(OUTFILE).tmp; \
	fi

pack: clean utils build moo crunch doc

moo:
	@echo "packing..."
	@if [ -e $(OUTFILE) ]; then \
		php ./utils/packer/pack.php $(OUTFILE) $(PACKFILE).tmp && \
		cat src/header.js > $(PACKFILE) && \
		cat src/JSJaCConfig.js >> $(PACKFILE) && \
		cat $(PACKFILE).tmp >> $(PACKFILE) && \
		rm $(PACKFILE).tmp; \
	else \
		echo "$(OUTFILE) not found. build failed?"; \
	fi

doc:
	@echo "creating jsdoc ...\c" 
	@utils/jsdoc3/jsdoc -d doc src/
	@echo " done."

utils:
	@make -C utils
clean:
	@rm -f $(OUTFILE) 2>/dev/null
	@rm -f $(PACKFILE) 2>/dev/null
	@rm -f $(UNCOMPRESSED) 2>/dev/null
	@rm -rf doc/
	@make -C utils clean

uncompressed:
	@if [ -e $(OUTFILE) ]; then \
		cat src/header.js > $(UNCOMPRESSED) && \
		cat src/JSJaCConfig.js >> $(UNCOMPRESSED) && \
		cat $(OUTFILE) >> $(UNCOMPRESSED); \
	fi

.PHONY: doc utils
