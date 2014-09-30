/** @jsx React.DOM */
(function(exports) {
'use strict';

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <div className='page-header'><h1>Taskcluster Index</h1></div>
        <p>This is a tool to browse the index of tasks.  Use it only for good.</p>
        <NamespaceSelector />
        <ComponentThatGoesPing />
        </div>
    );
  }
});

var NamespaceSelector = React.createClass({
  getInitialState: function() {
    return {
      result: null,
      error: null,
    }
  },
  clear: function() {
    this.replaceState(this.getInitialState());
  },
  error: function(error) {
    this.replaceState({error: error, result: null});
  },
  select: function(namespace) {
    var index = new window.taskcluster.index();
    var payload = {}
    if (this.state.result && this.state.result.continuationToken) {
      payload.continuationToken = this.state.result.continuationToken;
    }
    index.listNamespaces(namespace, payload)
      .then(function(result) {
        // There's a little bit of a conundrum here.  The API
        // doesn't differentiate between a namespace that exists
        // only as a container of tasks and a namespace that does
        // not exist at all.
        this.replaceState({error: null, result: result});
      }.bind(this))
      .then(null, function(error) {
        this.error(error);
      }.bind(this));
  },
  render: function() {
    var result = ''; 
    if (this.state.error) {
      result = <div className='alert alert-danger'>
        <span className='glyphicon glyphicon-exclamation-sign'> </span>
        <strong>ERROR</strong> {this.state.error.message || this.state.error}</div>;
    } else if (this.state.result) {
      result = <TasksForNamespace namespace={this.state.result} />
    }
    return <div>
      <h2>Search for Namespace</h2>
      <NamespaceSearchEntry search={this.select} clear={this.clear} error={this.error} />  
      {result}
      </div>
  }
});

var TasksForNamespace = React.createClass({
  load: function() {
      
  },
  render: function() {
    return <p>WHADDUP G-Unit! {this.props.namespace}</p>
  }
});

var NamespaceSearchEntry = React.createClass({
  getInitialState: function(){
    return {
      text: '',
    }
  },
  clear: function(e) {
    e.preventDefault();
    this.replaceState(this.getInitialState());
    this.props.clear();
  },
  search: function(e) {
    e.preventDefault();
    if (this.state.text === '') {
      this.props.error('To do a search you must enter search terms');
    } else {
      this.props.search(this.state.text);
    }
  },
  selectExisting: function(name) {
    this.setState({text: name});
    this.props.search(name);
  },
  handleChange: function(e) {
    this.setState({text: e.target.value});
  },
  render: function() {
    return <div>
      <label className='sr-only' htmlFor='namespace-entry'>Enter namespace</label>
      <form action='#'>
      <div className='input-group'>
      <input 
          onChange={this.handleChange}
          id='namespace-search-entry'
          className='form-control'
          type='text'
          ref='namespaceSearchEntry'
          value={this.state.text}
          placeholder='Enter namespace' />
      <span className='input-group-btn'>
        <button className='btn btn-primary' onClick={this.search}>
          <span className='glyphicon glyphicon-search'></span> Search
        </button>
        <SelectExisting error={this.props.error} select={this.selectExisting} />
        <button className='btn btn-default' onClick={this.clear}>Clear</button>
      </span>
      </div>
      </form>
    </div>;

  }
});

var SelectExisting = React.createClass({
  getInitialState: function() {
    return {
      namespaces: [],
      continuationToken: null,
      loading: true
    };
  },
  componentDidMount: function() {
    this.load();
  },
  select: function(e) {
    this.props.select(e.currentTarget.getAttribute('data-namespace'));
  },
  load: function() {
    var index = new window.taskcluster.index();
    var payload = {};
    if (this.state.continuationToken) {
      payload.continuationToken = this.state.continuationToken; 
    } else {
      // We reset so that we don't continuously append.  This could
      // be racing with the next setState on success, but let's focus
      // on something more important than non-harmful duplicate entries
      this.setState({namespaces: []});
    }
    //Is there a better way to list all namespaces?
    index.listNamespaces('', payload)
      .then(function(result) {
        this.setState({
          namespaces: this.state.namespaces.concat(result.namespaces),
          continuationToken: result.continuationToken,
          loading: false,
        });
      }.bind(this))
      .then(null, function(error) {
        this.setState({loading: false});
        this.props.error('Error loading existing values');
      }.bind(this));
  },
  render: function() {
    var list = [];
    if (this.state.loading) {
      list.push(<li key='loading'><a href='#'>Loading...</a></li>);
    } else {
      list = this.state.namespaces.map(function(ns) {
        return <li
                  data-name={ns.name}
                  data-namespace={ns.namespace}
                  data-expires={ns.expires}
                  key={ns.namespace}
                  onClick={this.select}><a href='#'>{ns.name}</a></li>;
      }, this);
    }
    // Quick hack from http://stackoverflow.com/a/19229738
    var style = {
      height: 'auto',
      'max-height': '500px',
      'overflow-x': 'hidden',
    };
    return <div className='btn-group'>
           <button className='btn btn-primary dropdown-toggle' data-toggle='dropdown'>
             Select Existing <span className='caret'></span></button>
           <ul className='dropdown-menu scrollable-menu' role='menu' style={style}>{list}</ul>
           </div>
  }
});

var ComponentThatGoesPing = React.createClass({
  getInitialState: function(){
    return {
      alive: null,
      uptime: null
    };
  },
  pingServer: function() {
    var index = new window.taskcluster.index();
    index.ping().then(function(result) {
      console.log(result);
      this.setState(result);
    }.bind(this))
  },
  render: function() {
    return <div>
      <h2>Ping!<small>check if the indexing server is up</small></h2>
      <PingButton handler={this.pingServer} />
      <PingResult alive={this.state.alive} uptime={this.state.uptime} />
    </div>;
  }
});

var PingButton = React.createClass({
  render: function() {
    return <button onClick={this.props.handler} className='btn btn-primary'>
          <span className='glyphicon glyphicon-signal'></span> Ping Server
          </button>;
  }
});

var PingResult = React.createClass({
  render: function() {
    var alive = this.props.alive;
    var string = 'is untested';
    if (alive !== null) {
      if (alive) {
        var date = new Date(this.props.uptime * 1000 + Date.now());
        string = 'has been up for ' + humaneDate(date);
      } else {
        string = 'is down';
      }
    }
    return <div className='alert alert-info'>Server {string}</div>;
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
