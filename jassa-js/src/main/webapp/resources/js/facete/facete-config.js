(function() {

    var util = Jassa.util;
    var rdf = Jassa.rdf;
    
    // TODO Get rid of this dependency :/
    var sponate = Jassa.sponate;
    
    var ns = Jassa.facete;
    
    ns.FacetConfig = Class.create({
        classLabel: 'jassa.facete.FacetConfig',
        
        initialize: function(baseConcept, rootFacetNode, constraintManager, labelMap, pathTaggerManager) {
            this.baseConcept = baseConcept;
            
            // TODO ISSUE: We may modify the rootFacetNode during an update cycle, which triggers a new cycle, and thus
            // negatively impacts performance. The easiest solution would be to exclude this method from the watch list.
            this.rootFacetNode = rootFacetNode;
            this.constraintManager = constraintManager;
            
            this.labelMap = labelMap || sponate.SponateUtils.createDefaultLabelMap(); 
            this.pathTaggerManager = pathTaggerManager || new ns.ItemTaggerManager();
        },
        
        getBaseConcept: function() {
            return this.baseConcept;
        },
        
        setBaseConcept: function(baseConcept) {
            this.baseConcept = baseConcept;
        },
        
        getRootFacetNode: function() {
            return this.rootFacetNode;
        },
        
        setRootFacetNode: function(rootFacetNode) {
            this.rootFacetNode = rootFacetNode;
        },
        
        getConstraintManager: function() {
            return this.constraintManager;
        },
        
        setConstraintManager: function(constraintManager) {
            this.constraintManager = constraintManager;
        },
        
        getLabelMap: function() {
            return this.labelMap;
        },
        
        setLabelMap: function(labelMap) {
            this.labelMap = labelMap;
        },
        
        getPathTaggerManager: function() {
            return this.pathTaggerManager;
        },

        /**
         * The purpose of this method is to detect changes in the configuration!
         * TODO rely on hash codes from child components
         * 
         */
        hashCode: function() {
            
            // We omit the facetNode attribute, as this one should not be changed 'on the outside' anyway;
            // internal changes cause angular's digest loop to execute twice
            // TODO HACK We shouldn't abuse hashCode() for hacking about issues which are specific to how we do things with angular
            var shallowCopy = _(this).omit('rootFacetNode');
            
            var result = util.ObjectUtils.hashCode(shallowCopy, true);
            return result;
        }
        
        // The following attributes are pretty much UI dependent
        // facetStateProvider, pathToFilterString, expansionSet
    });

    ns.FacetConfig.createDefaultFacetConfig = function() {
        var baseVar = rdf.NodeFactory.createVar("s");
        var baseConcept = ns.ConceptUtils.createSubjectConcept(baseVar);
        //var sparqlStr = sparql.SparqlString.create("?s a ?t");
        //var baseConcept = new ns.Concept(new sparql.ElementString(sparqlStr));
        var rootFacetNode = ns.FacetNode.createRoot(baseVar);

        var constraintManager = new ns.ConstraintManager();
        
        var result = new ns.FacetConfig(baseConcept, rootFacetNode, constraintManager);
        return result;
    };


    /**
     * 
     * ExpansionSet: Whether a path is expanded at all
     * ExpansionMap: If a path is expanded, whether to fetch the incoming or outgoing properties or both
     * 
     */
    ns.FacetTreeConfig = Class.create({
        classLabel: 'jassa.facete.FacetTreeConfig',
        
        initialize: function(facetConfig, labelMap, expansionSet, expansionMap, facetStateProvider, pathToFilterString) {
            this.facetConfig = facetConfig || ns.FacetConfig.createDefaultFacetConfig();

            //this.labelMap = labelMap; // TODO Use some default (shouldn't the label map be part of the facetConfig???)
            this.expansionSet = expansionSet || new util.HashSet();
            this.expansionMap = expansionMap || new util.HashMap();
            this.facetStateProvider = facetStateProvider || new ns.FacetStateProviderImpl(10);
            this.pathToFilterString = pathToFilterString || new util.HashMap();
        },
        
        getFacetConfig: function() {
            return this.facetConfig;
        },
        
        setFacetConfig: function(facetConfig) {
            this.facetConfig = facetConfig;
        },
        
//        getLabelMap: function() {
//            return this.labelMap;
//        },
        
        getExpansionSet: function() {
            return this.expansionSet;
        },

        getExpansionMap: function() {
            return this.expansionMap;
        },
        
        getFacetStateProvider: function() {
            return this.facetStateProvider;
        },
        
        getPathToFilterString: function() {
            return this.pathToFilterString;
        },
        
        /**
         * The purpose of this method is to detect changes in the configuration!
         * TODO rely on hash codes from child components
         * 
         */
        hashCode: function() {
            var result = util.ObjectUtils.hashCode(this, true);
            return result;
        }
    });

    
    /**
     * 
     * 
     * TODO Possibly rename to FaceteConfigUtils
     */
    ns.FaceteUtils = {
            createFacetConceptGenerator: function(facetConfig) {
                var baseConcept = facetConfig.getBaseConcept();
                var rootFacetNode = facetConfig.getRootFacetNode();
                var constraintManager = facetConfig.getConstraintManager();
                
                var result = this.createFacetConceptGenerator2(baseConcept, rootFacetNode, constraintManager);
                return result;
            },
            
            createFacetConceptGenerator2: function(baseConcept, rootFacetNode, constraintManager) {
                // Based on above objects, create a provider for the configuration
                // which the facet service can build upon
                var facetConfigProvider = new ns.FacetGeneratorConfigProviderIndirect(
                    new ns.ConceptFactoryConst(baseConcept),
                    new ns.FacetNodeFactoryConst(rootFacetNode),
                    constraintManager
                );
                
                var fcgf = new ns.FacetConceptGeneratorFactoryImpl(facetConfigProvider);
                var result = fcgf.createFacetConceptGenerator();
                
                return result;
            },
            
//            createFacetService: function(facetConfig) {
//                var result = this.createFacetService2(facetConfig.);
//            },
//            
            createFacetService: function(sparqlService, facetConfig) {
                var facetConceptGenerator = this.createFacetConceptGenerator(facetConfig);

                //labelMap = labelMap || sponate.SponateUtils.createDefaultLabelMap();
                
                var facetService = new ns.FacetServiceImpl(sparqlService, facetConceptGenerator, facetConfig.getLabelMap(), facetConfig.getPathTaggerManager());

                return facetService;
            },
            
            
            
            createFacetTreeService: function(sparqlService, facetTreeConfig) {


                var facetService = this.createFacetService(sparqlService, facetTreeConfig.getFacetConfig());
                
                var expansionSet = facetTreeConfig.getExpansionSet();
                var expansionMap = facetTreeConfig.getExpansionMap();
                var facetStateProvider = facetTreeConfig.getFacetStateProvider();
                var pathToFilterString = facetTreeConfig.getPathToFilterString();
                

                var facetTreeService = new ns.FacetTreeServiceImpl(facetService, expansionSet, expansionMap, facetStateProvider, pathToFilterString);

                return facetTreeService;

                //var constraintTaggerFactory = new ns.ConstraintTaggerFactory(constraintManager);       
                
                
                //var faceteConceptFactory = new ns.ConceptFactoryFacetService(facetService);
                
                
                //var result = new ns.ConceptSpace(facetTreeService);
                
                //return result;            
            },
            
            createFacetTreeTagger: function(pathToFilterString) {
                //var tableMod = new ns.FaceteTableMod(); 
                //tableMod.togglePath(new ns.Path());
                
                
                var pathTagger = new ns.ItemTaggerManager();
                //pathTagger.getTaggerMap()['table'] = new ns.ItemTaggerTablePath(tableMod);
                pathTagger.getTaggerMap()['filter'] = new ns.ItemTaggerFilterString(pathToFilterString);
                var facetTreeTagger = new ns.FacetTreeTagger(pathTagger);
                
                return facetTreeTagger;
            }

        };

    
    
})();
